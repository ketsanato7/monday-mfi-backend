/**
 * DPD Collection Routes — Auto-calculate DPD + Collection APIs
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * POST /api/collection/calculate-dpd
 * ── ຄິດ DPD ອັດ ຕະ ໂນ ມັດ ทุก ສັນ ຍາ ──
 */
router.post('/calculate-dpd', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. ຫາ ສັນ ຍາ ທີ່ active
        const contracts = await client.query(`
            SELECT lc.id, lc.contract_no, lc.days_past_due as old_dpd
            FROM loan_contracts lc
            WHERE lc.loan_status IN ('ACTIVE','DISBURSED')
              AND lc.deleted_at IS NULL
        `);

        let updated = 0;
        let notifications = [];

        for (const contract of contracts.rows) {
            // 2. ຫາ ງວດ ແລກ ທີ່ ຍັງ ບໍ່ ຈ່າຍ
            const overdue = await client.query(`
                SELECT MIN(due_date) as earliest_unpaid, COUNT(*) as overdue_count
                FROM loan_repayment_schedules
                WHERE contract_id = $1
                  AND is_paid = false
                  AND due_date < CURRENT_DATE
            `, [contract.id]);

            const earliestUnpaid = overdue.rows[0]?.earliest_unpaid;
            let newDPD = 0;

            if (earliestUnpaid) {
                newDPD = Math.floor((Date.now() - new Date(earliestUnpaid).getTime()) / (1000 * 60 * 60 * 24));
            }

            // 3. UPDATE loan_contracts
            if (newDPD !== contract.old_dpd) {
                // ── ກຳ ນົດ classification ──
                let classificationCode = 'NORMAL';
                let collectionStatus = 'NORMAL';
                if (newDPD >= 90) { classificationCode = 'LOSS'; collectionStatus = 'NPL'; }
                else if (newDPD >= 30) { classificationCode = 'SUBSTANDARD'; collectionStatus = 'INTENSIVE'; }
                else if (newDPD >= 15) { classificationCode = 'WATCH'; collectionStatus = 'FOLLOW_UP'; }

                await client.query(`
                    UPDATE loan_contracts
                    SET days_past_due = $1,
                        collection_status = $2,
                        updated_at = NOW()
                    WHERE id = $3
                `, [newDPD, collectionStatus, contract.id]);

                updated++;

                // 4. ── ສ້າງ notification ເມື່ອ ຂ້າມ threshold ──
                const thresholds = [1, 3, 7, 15, 30, 90];
                for (const t of thresholds) {
                    if (contract.old_dpd < t && newDPD >= t) {
                        notifications.push({
                            contract_id: contract.id,
                            contract_no: contract.contract_no,
                            dpd: newDPD,
                            threshold: t,
                        });
                    }
                }
            }
        }

        // 5. ── INSERT notifications ──
        for (const n of notifications) {
            const msgMap = {
                1: '📱 ງວດ ເລີ່ມ ຄ້າງ',
                3: '📞 ຕ້ອງ ໂທ ຕິດ ຕາມ',
                7: '⚠️ ຄ້າງ 7 ວັນ - ແຈ້ງ ຜູ້ ຈັດ ການ',
                15: '🟠 ຕ້ອງ ເຢືອນ ລູກ ຄ້າ',
                30: '🔴 ມອບ ໃຫ້ Collection Team',
                90: '⚫ NPL - ຕັ້ງ Provision',
            };
            await client.query(`
                INSERT INTO notifications (type, title, message, entity_type, entity_id, channel)
                VALUES ('DPD_ALERT', $1, $2, 'loan_contracts', $3, 'SYSTEM')
            `, [
                `DPD ${n.threshold}+ | ${n.contract_no}`,
                `${msgMap[n.threshold]} | ສັນ ຍາ ${n.contract_no} (DPD: ${n.dpd})`,
                n.contract_id,
            ]);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `DPD ຄິດ ສຳ ເລັດ`,
            updated,
            total: contracts.rows.length,
            notifications: notifications.length,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('DPD Calculation error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

/**
 * GET /api/collection/dashboard-stats
 * ── KPI ສຳ ລັບ Dashboard ──
 */
router.get('/dashboard-stats', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE days_past_due > 0) as total_overdue,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 0 AND 3) as bucket_0_3,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 4 AND 15) as bucket_4_15,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 16 AND 30) as bucket_16_30,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 31 AND 90) as bucket_31_90,
                COUNT(*) FILTER (WHERE days_past_due > 90) as bucket_90_plus,
                COALESCE(SUM(remaining_balance) FILTER (WHERE days_past_due >= 30), 0) as par30_amount,
                COALESCE(SUM(remaining_balance) FILTER (WHERE days_past_due >= 90), 0) as par90_amount,
                COALESCE(SUM(remaining_balance), 0) as total_balance,
                COUNT(*) as total_contracts
            FROM loan_contracts
            WHERE loan_status IN ('ACTIVE','DISBURSED')
              AND deleted_at IS NULL
        `);

        const s = stats.rows[0];
        const totalBal = Number(s.total_balance) || 1;

        res.json({
            par30: ((Number(s.par30_amount) / totalBal) * 100).toFixed(1),
            par90: ((Number(s.par90_amount) / totalBal) * 100).toFixed(1),
            nplCount: Number(s.bucket_90_plus),
            nplRatio: ((Number(s.bucket_90_plus) / (Number(s.total_contracts) || 1)) * 100).toFixed(1),
            totalOverdue: Number(s.total_overdue),
            buckets: {
                '0-3': Number(s.bucket_0_3),
                '4-15': Number(s.bucket_4_15),
                '16-30': Number(s.bucket_16_30),
                '31-90': Number(s.bucket_31_90),
                '90+': Number(s.bucket_90_plus),
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/collection/overdue-contracts
 * ── ລາຍ ການ ສັນ ຍາ ທີ່ ຄ້າງ ──
 */
router.get('/overdue-contracts', async (req, res) => {
    try {
        const { bucket } = req.query;
        let whereClause = 'WHERE lc.days_past_due > 0 AND lc.loan_status IN (\'ACTIVE\',\'DISBURSED\') AND lc.deleted_at IS NULL';

        if (bucket === '0-3') whereClause += ' AND lc.days_past_due BETWEEN 0 AND 3';
        else if (bucket === '4-15') whereClause += ' AND lc.days_past_due BETWEEN 4 AND 15';
        else if (bucket === '16-30') whereClause += ' AND lc.days_past_due BETWEEN 16 AND 30';
        else if (bucket === '31-90') whereClause += ' AND lc.days_past_due BETWEEN 31 AND 90';
        else if (bucket === '90+') whereClause += ' AND lc.days_past_due > 90';

        const result = await pool.query(`
            SELECT lc.id, lc.contract_no, lc.remaining_balance, lc.days_past_due,
                   lc.loan_status, lc.collection_status, lc.last_contact_date,
                   lc.next_follow_up_date,
                   COALESCE(pi.firstname__la, '') || ' ' || COALESCE(pi.lastname__la, '') as borrower_name,
                   cd.phone_primary as phone
            FROM loan_contracts lc
            LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
            LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
            LEFT JOIN contact_details cd ON cd.person_id = pi.id
            ${whereClause}
            ORDER BY lc.days_past_due DESC
            LIMIT 200
        `);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/collection/officer-stats
 * ── ສະ ຖິ ຕິ Officer Performance ──
 */
router.get('/officer-stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                e.id as officer_id,
                COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') as officer_name,
                COUNT(DISTINCT ca.contract_id) as total_cases,
                COUNT(ca.id) as total_actions,
                COUNT(ca.id) FILTER (WHERE ca.contact_result = 'PAID') as resolved_count,
                COUNT(ca.id) FILTER (WHERE ca.contact_result = 'PROMISE') as ptp_count,
                COUNT(ptp.id) FILTER (WHERE ptp.status = 'KEPT') as ptp_kept,
                COUNT(ptp.id) FILTER (WHERE ptp.status = 'BROKEN') as ptp_broken
            FROM employees e
            LEFT JOIN collection_actions ca ON ca.officer_id = e.id
            LEFT JOIN promise_to_pay ptp ON ptp.created_by = e.id
            GROUP BY e.id, e.first_name, e.last_name
            HAVING COUNT(ca.id) > 0
            ORDER BY COUNT(ca.id) DESC
        `);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
