/**
 * collectionAutoAssign.js — Auto-assign overdue loans to collection officers (DB-driven)
 * 
 * ດຶງ ກົດ ເກນ ຈາກ ຕາ ຕະ ລາງ collection_escalation_rules
 * ແທນ ການ hardcode ACTION_ESCALATION ໃນ code
 * 
 * Escalation logic reads from DB:
 * - DPD range → action_type + label + next_action_days
 */
const db = require('../models');
const sequelize = db.sequelize;

/**
 * Load active collection escalation rules from database
 */
async function loadRulesFromDB() {
    const [rules] = await sequelize.query(`
        SELECT id, rule_name, dpd_min, dpd_max, action_type, action_label, next_action_days
        FROM collection_escalation_rules
        WHERE is_active = true
        ORDER BY sort_order ASC, dpd_min ASC
    `);
    return rules;
}

/**
 * Get available collection officers
 */
async function getOfficers() {
    const [officers] = await sequelize.query(`
        SELECT u.id, u.username, u.username as full_name,
            (SELECT COUNT(*) FROM collection_actions ca 
             WHERE ca.officer_id = u.id 
             AND ca.contact_result IS NULL 
             AND ca.action_date >= NOW() - INTERVAL '30 days') as active_cases
        FROM users u
        WHERE u.is_active = true
        ORDER BY active_cases ASC
    `);
    return officers;
}

/**
 * Determine escalation action type based on DPD (from DB rules)
 */
async function getActionType(dpd) {
    const rules = await loadRulesFromDB();
    for (const rule of rules) {
        if (dpd >= rule.dpd_min && dpd <= rule.dpd_max) {
            return {
                type: rule.action_type,
                label: rule.action_label,
                nextDays: rule.next_action_days,
            };
        }
    }
    // Fallback if no rule matches
    return { type: 'LEGAL_ACTION', label: 'ດຳ ເນີນ ທາງ ກົດ ໝາຍ', nextDays: 30 };
}

/**
 * Auto-assign overdue contracts to collection officers
 * @returns {Object} { assigned, skipped, errors }
 */
async function autoAssign() {
    let assigned = 0, skipped = 0, errors = 0;

    try {
        const officers = await getOfficers();
        if (officers.length === 0) {
            return { assigned: 0, skipped: 0, errors: 0, message: 'ບໍ່ ມີ ເຈົ້າ ໜ້າ ທີ່' };
        }

        // Load rules once
        const rules = await loadRulesFromDB();
        if (rules.length === 0) {
            return { assigned: 0, skipped: 0, errors: 0, message: 'ບໍ່ ມີ ກົດ ເກນ active' };
        }

        // Get overdue contracts without recent collection action (last 7 days)
        const [overdueContracts] = await sequelize.query(`
            SELECT lc.id, lc.contract_no, lc.days_past_due, lc.approved_amount,
                   lc.remaining_balance, lc.collection_status,
                   pi.firstname__la, pi.lastname__la
            FROM loan_contracts lc
            LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
            LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
            WHERE lc.days_past_due > 0
            AND lc.loan_status IN ('ACTIVE', 'DISBURSED')
            AND lc.deleted_at IS NULL
            AND lc.id NOT IN (
                SELECT DISTINCT contract_id FROM collection_actions
                WHERE action_date >= NOW() - INTERVAL '7 days'
                AND contact_result IS NULL
            )
            ORDER BY lc.days_past_due DESC
        `);

        let officerIndex = 0;

        for (const contract of overdueContracts) {
            const dpd = contract.days_past_due || 0;

            // Find matching rule from DB
            let action = null;
            for (const rule of rules) {
                if (dpd >= rule.dpd_min && dpd <= rule.dpd_max) {
                    action = { type: rule.action_type, label: rule.action_label, nextDays: rule.next_action_days };
                    break;
                }
            }
            if (!action) {
                action = { type: 'LEGAL_ACTION', label: 'ດຳ ເນີນ ທາງ ກົດ ໝາຍ', nextDays: 30 };
            }

            const officer = officers[officerIndex % officers.length];

            const nextActionDate = new Date();
            nextActionDate.setDate(nextActionDate.getDate() + action.nextDays);

            try {
                // Create collection action
                await sequelize.query(`
                    INSERT INTO collection_actions 
                    (contract_id, action_type, action_date, officer_id, dpd_at_action,
                     notes, next_action_date, created_at, updated_at)
                    VALUES ($1, $2, NOW(), $3, $4, $5, $6, NOW(), NOW())
                `, {
                    bind: [
                        contract.id,
                        action.type,
                        officer.id,
                        dpd,
                        `Auto-assigned: ${action.label} | ${contract.firstname__la || ''} ${contract.lastname__la || ''} | ${Number(contract.remaining_balance || 0).toLocaleString()} ₭`,
                        nextActionDate.toISOString(),
                    ],
                });

                // Notify officer
                await sequelize.query(`
                    INSERT INTO notifications 
                    (user_id, type, title, message, entity_type, entity_id, 
                     is_read, channel, "createdAt", "updatedAt")
                    VALUES ($1, 'COLLECTION_ASSIGN', $2, $3, 'loan_contract', $4,
                            false, 'SYSTEM', NOW(), NOW())
                `, {
                    bind: [
                        officer.id,
                        `📋 ${action.label}: ${contract.contract_no}`,
                        `ທ່ານ ໄດ້ ຮັບ ມອບ ໝາຍ: ${contract.contract_no} (DPD ${dpd}) — ${action.label}. ` +
                        `ລູກ ຄ້າ: ${contract.firstname__la || ''} ${contract.lastname__la || ''}, ` +
                        `ຍອດ ຄ້າງ: ${Number(contract.remaining_balance || 0).toLocaleString()} ₭. ` +
                        `Next action: ${nextActionDate.toLocaleDateString('lo-LA')}`,
                        contract.id,
                    ],
                });

                assigned++;
                officerIndex++;
            } catch (err) {
                errors++;
                console.error(`Auto-assign error for contract ${contract.id}:`, err.message);
            }
        }
    } catch (err) {
        console.error('autoAssign error:', err.message);
        errors++;
    }

    return { assigned, skipped, errors, timestamp: new Date().toISOString() };
}

/**
 * Get collection workload summary per officer
 */
async function getWorkloadSummary() {
    const [summary] = await sequelize.query(`
        SELECT 
            ca.officer_id,
            u.username as officer_name,
            COUNT(*) as total_cases,
            SUM(CASE WHEN ca.contact_result IS NULL THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN ca.contact_result = 'CONTACTED' THEN 1 ELSE 0 END) as contacted,
            SUM(CASE WHEN ca.contact_result = 'PROMISED' THEN 1 ELSE 0 END) as promised,
            SUM(CASE WHEN ca.contact_result = 'NOT_REACHABLE' THEN 1 ELSE 0 END) as unreachable,
            AVG(ca.dpd_at_action) as avg_dpd
        FROM collection_actions ca
        LEFT JOIN users u ON u.id = ca.officer_id
        WHERE ca.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY ca.officer_id, u.username
        ORDER BY total_cases DESC
    `);
    return summary;
}

/**
 * Log a collection action result
 */
async function logActionResult(actionId, result, notes) {
    await sequelize.query(`
        UPDATE collection_actions
        SET contact_result = $1, notes = COALESCE(notes, '') || ' | ' || $2, updated_at = NOW()
        WHERE id = $3
    `, { bind: [result, notes, actionId] });
    return { success: true };
}

module.exports = {
    autoAssign,
    getWorkloadSummary,
    getOfficers,
    logActionResult,
    getActionType,
    loadRulesFromDB,
};
