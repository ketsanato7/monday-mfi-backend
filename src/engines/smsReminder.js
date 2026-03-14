/**
 * smsReminder.js — SMS/Notification Reminder Engine (DB-driven)
 * 
 * ດຶງ ກົດ ເກນ ຈາກ ຕາ ຕະ ລາງ sms_escalation_rules
 * ແທນ ການ hardcode ໃນ code
 * 
 * BoL Notification Requirements:
 * - Must notify before and after due date
 * - Must escalate based on DPD thresholds
 */
const db = require('../models');
const sequelize = db.sequelize;

/**
 * Load active SMS escalation rules from database
 */
async function loadRulesFromDB() {
    const [rules] = await sequelize.query(`
        SELECT id, rule_name, dpd_trigger, channel, message_template, sort_order
        FROM sms_escalation_rules
        WHERE is_active = true
        ORDER BY sort_order ASC
    `);
    return rules;
}

/**
 * Replace {variables} in message template with actual data
 */
function renderTemplate(template, data) {
    return template
        .replace(/\{contract_no\}/g, data.contract_no || '')
        .replace(/\{amount\}/g, data.amount || '')
        .replace(/\{dpd\}/g, data.dpd || '0')
        .replace(/\{due_date\}/g, data.due_date || '')
        .replace(/\{installment_no\}/g, data.installment_no || '')
        .replace(/\{name\}/g, data.name || '');
}

/**
 * Generate reminders for all upcoming and overdue schedules
 * @returns {Object} { created, skipped, errors }
 */
async function generateReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let created = 0, skipped = 0, errors = 0;

    try {
        // ─── Load rules from DB ───
        const rules = await loadRulesFromDB();
        if (rules.length === 0) {
            return { created: 0, skipped: 0, errors: 0, message: 'ບໍ່ ມີ ກົດ ເກນ active' };
        }

        // Calculate max range for query
        const maxBefore = Math.max(...rules.filter(r => r.dpd_trigger <= 0).map(r => Math.abs(r.dpd_trigger)), 3);
        const maxAfter = Math.max(...rules.filter(r => r.dpd_trigger > 0).map(r => r.dpd_trigger), 90);

        // Get schedules that need reminders
        const [schedules] = await sequelize.query(`
            SELECT lrs.id, lrs.contract_id, lrs.installment_no,
                   lrs.due_date, lrs.total_amount, lrs.is_paid,
                   lc.contract_no, lc.days_past_due,
                   bi.personal_info_id,
                   pi.firstname__la, pi.lastname__la,
                   cd.contact_value as phone_number
            FROM loan_repayment_schedules lrs
            JOIN loan_contracts lc ON lc.id = lrs.contract_id
            LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
            LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
            LEFT JOIN contact_details cd ON cd.person_id = pi.id
            WHERE lrs.is_paid = false
            AND lrs.due_date BETWEEN (NOW() - INTERVAL '${maxAfter} days') AND (NOW() + INTERVAL '${maxBefore} days')
            ORDER BY lrs.due_date ASC
        `);

        for (const sched of schedules) {
            const dueDate = new Date(sched.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((today - dueDate) / 86400000);

            // Find applicable rules from DB
            for (const rule of rules) {
                const trigger = rule.dpd_trigger;
                let shouldSend = false;

                if (trigger <= 0 && diffDays === trigger) {
                    shouldSend = true; // Pre-due or due-day
                }
                if (trigger > 0 && diffDays === trigger) {
                    shouldSend = true; // Overdue
                }

                if (!shouldSend) continue;

                const ruleType = `RULE_${rule.id}_DPD_${trigger}`;

                // Check if already sent today
                const [existing] = await sequelize.query(`
                    SELECT id FROM notifications
                    WHERE entity_type = 'repayment_schedule' AND entity_id = $1
                    AND type = $2 AND DATE("createdAt") = CURRENT_DATE
                `, { bind: [sched.id, ruleType] });

                if (existing.length > 0) {
                    skipped++;
                    continue;
                }

                // Render message from DB template
                const message = renderTemplate(rule.message_template, {
                    installment_no: sched.installment_no,
                    amount: Number(sched.total_amount).toLocaleString(),
                    due_date: new Date(sched.due_date).toLocaleDateString('lo-LA'),
                    contract_no: sched.contract_no,
                    dpd: Math.max(0, diffDays),
                    name: `${sched.firstname__la || ''} ${sched.lastname__la || ''}`.trim(),
                });

                // Create notification
                try {
                    await sequelize.query(`
                        INSERT INTO notifications 
                        (user_id, type, title, message, entity_type, entity_id, 
                         is_read, channel, "createdAt", "updatedAt")
                        VALUES ($1, $2, $3, $4, 'repayment_schedule', $5,
                                false, $6, NOW(), NOW())
                    `, {
                        bind: [
                            1,
                            ruleType,
                            `${rule.channel}: ${sched.contract_no} ງວດ #${sched.installment_no}`,
                            message,
                            sched.id,
                            rule.channel,
                        ],
                    });
                    created++;
                } catch (err) {
                    errors++;
                    console.error('SMS insert error:', err.message);
                }
            }
        }
    } catch (err) {
        console.error('generateReminders error:', err.message);
        errors++;
    }

    return { created, skipped, errors, timestamp: new Date().toISOString() };
}

/**
 * Get notification history for a loan
 */
async function getLoanNotifications(contractId) {
    const [notifications] = await sequelize.query(`
        SELECT n.* FROM notifications n
        JOIN loan_repayment_schedules lrs ON lrs.id = n.entity_id
        WHERE n.entity_type = 'repayment_schedule' 
        AND lrs.contract_id = $1
        ORDER BY n."createdAt" DESC
        LIMIT 50
    `, { bind: [contractId] });
    return notifications;
}

/**
 * Get reminder stats for dashboard
 */
async function getReminderStats() {
    const [stats] = await sequelize.query(`
        SELECT 
            channel,
            COUNT(*) as total,
            SUM(CASE WHEN is_read THEN 1 ELSE 0 END) as read_count,
            SUM(CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END) as sent_count
        FROM notifications
        WHERE entity_type = 'repayment_schedule'
        AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY channel
    `);
    return stats;
}

module.exports = {
    generateReminders,
    getLoanNotifications,
    getReminderStats,
    loadRulesFromDB,
    renderTemplate,
};
