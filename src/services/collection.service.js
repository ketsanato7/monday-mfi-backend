/**
 * collection.service.js — DPD auto-calculate, dashboard stats, overdue contracts, officer stats
 */
const pool = require('../config/database');
const { requireAuth } = require('../middleware/rbac');

class CollectionService {
    static async calculateDPD() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const contracts = await client.query(`SELECT lc.id, lc.contract_no, lc.days_past_due as old_dpd FROM loan_contracts lc WHERE lc.loan_status IN ('ACTIVE','DISBURSED') AND lc.deleted_at IS NULL`);
            let updated = 0, notifications = [];
            for (const c of contracts.rows) {
                const od = await client.query(`SELECT MIN(due_date) as earliest_unpaid, COUNT(*) as overdue_count FROM loan_repayment_schedules WHERE contract_id = $1 AND is_paid = false AND due_date < CURRENT_DATE`, [c.id]);
                let dpd = 0; if (od.rows[0]?.earliest_unpaid) dpd = Math.floor((Date.now() - new Date(od.rows[0].earliest_unpaid).getTime()) / 86400000);
                if (dpd !== c.old_dpd) {
                    let cs = 'NORMAL'; if (dpd >= 90) cs = 'NPL'; else if (dpd >= 30) cs = 'INTENSIVE'; else if (dpd >= 15) cs = 'FOLLOW_UP';
                    await client.query(`UPDATE loan_contracts SET days_past_due = $1, collection_status = $2, updated_at = NOW() WHERE id = $3`, [dpd, cs, c.id]);
                    updated++;
                    for (const t of [1,3,7,15,30,90]) { if (c.old_dpd < t && dpd >= t) notifications.push({ contract_id: c.id, contract_no: c.contract_no, dpd, threshold: t }); }
                }
            }
            const msgMap = { 1:'📱 ງວດເລີ່ມຄ້າງ', 3:'📞 ຕ້ອງໂທຕິດຕາມ', 7:'⚠️ ຄ້າງ 7 ວັນ', 15:'🟠 ເຢືອນລູກຄ້າ', 30:'🔴 Collection Team', 90:'⚫ NPL' };
            for (const n of notifications) await client.query(`INSERT INTO notifications (type, title, message, entity_type, entity_id, channel) VALUES ('DPD_ALERT', $1, $2, 'loan_contracts', $3, 'SYSTEM')`, [`DPD ${n.threshold}+ | ${n.contract_no}`, `${msgMap[n.threshold]} | ${n.contract_no} (DPD: ${n.dpd})`, n.contract_id]);
            await client.query('COMMIT');
            return { success: true, message: 'DPD ຄິດສຳເລັດ', updated, total: contracts.rows.length, notifications: notifications.length };
        } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    }

    static async dashboardStats() {
        const s = (await pool.query(`SELECT COUNT(*) FILTER (WHERE days_past_due > 0) as total_overdue, COUNT(*) FILTER (WHERE days_past_due BETWEEN 0 AND 3) as b0, COUNT(*) FILTER (WHERE days_past_due BETWEEN 4 AND 15) as b1, COUNT(*) FILTER (WHERE days_past_due BETWEEN 16 AND 30) as b2, COUNT(*) FILTER (WHERE days_past_due BETWEEN 31 AND 90) as b3, COUNT(*) FILTER (WHERE days_past_due > 90) as b4, COALESCE(SUM(remaining_balance) FILTER (WHERE days_past_due >= 30), 0) as par30, COALESCE(SUM(remaining_balance) FILTER (WHERE days_past_due >= 90), 0) as par90, COALESCE(SUM(remaining_balance), 0) as bal, COUNT(*) as total FROM loan_contracts WHERE loan_status IN ('ACTIVE','DISBURSED') AND deleted_at IS NULL`)).rows[0];
        const tb = Number(s.bal) || 1, tc = Number(s.total) || 1;
        return { par30: ((Number(s.par30)/tb)*100).toFixed(1), par90: ((Number(s.par90)/tb)*100).toFixed(1), nplCount: Number(s.b4), nplRatio: ((Number(s.b4)/tc)*100).toFixed(1), totalOverdue: Number(s.total_overdue), buckets: { '0-3': Number(s.b0), '4-15': Number(s.b1), '16-30': Number(s.b2), '31-90': Number(s.b3), '90+': Number(s.b4) } };
    }

    static async overdueContracts(bucket) {
        let wc = "WHERE lc.days_past_due > 0 AND lc.loan_status IN ('ACTIVE','DISBURSED') AND lc.deleted_at IS NULL";
        if (bucket === '0-3') wc += ' AND lc.days_past_due BETWEEN 0 AND 3'; else if (bucket === '4-15') wc += ' AND lc.days_past_due BETWEEN 4 AND 15'; else if (bucket === '16-30') wc += ' AND lc.days_past_due BETWEEN 16 AND 30'; else if (bucket === '31-90') wc += ' AND lc.days_past_due BETWEEN 31 AND 90'; else if (bucket === '90+') wc += ' AND lc.days_past_due > 90';
        return (await pool.query(`SELECT lc.id, lc.contract_no, lc.remaining_balance, lc.days_past_due, lc.loan_status, lc.collection_status, lc.last_contact_date, lc.next_follow_up_date, COALESCE(pi.firstname__la,'')||' '||COALESCE(pi.lastname__la,'') as borrower_name, cd.phone_primary as phone FROM loan_contracts lc LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id LEFT JOIN contact_details cd ON cd.person_id = pi.id ${wc} ORDER BY lc.days_past_due DESC LIMIT 200`)).rows;
    }

    static async officerStats() {
        return (await pool.query(`SELECT e.id as officer_id, COALESCE(e.first_name,'')||' '||COALESCE(e.last_name,'') as officer_name, COUNT(DISTINCT ca.contract_id) as total_cases, COUNT(ca.id) as total_actions, COUNT(ca.id) FILTER (WHERE ca.contact_result = 'PAID') as resolved_count, COUNT(ca.id) FILTER (WHERE ca.contact_result = 'PROMISE') as ptp_count, COUNT(ptp.id) FILTER (WHERE ptp.status = 'KEPT') as ptp_kept, COUNT(ptp.id) FILTER (WHERE ptp.status = 'BROKEN') as ptp_broken FROM employees e LEFT JOIN collection_actions ca ON ca.officer_id = e.id LEFT JOIN promise_to_pay ptp ON ptp.created_by = e.id GROUP BY e.id, e.first_name, e.last_name HAVING COUNT(ca.id) > 0 ORDER BY COUNT(ca.id) DESC`)).rows;
    }
}

module.exports = CollectionService;
