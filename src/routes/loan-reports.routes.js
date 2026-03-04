/**
 * loan-reports.routes.js — ລາຍງານ + ECL + GL
 *
 * R1: POST /api/loan-reports/ecl-calculate        — ECL IFRS 9
 * R1: GET  /api/loan-reports/ecl-staging           — ເບິ່ງ ECL staging
 * R2: POST /api/loan-reports/close-period          — ປິດງວດ GL
 * R2: GET  /api/loan-reports/trial-balance/:periodId — ງົບທົດລອງ
 * R4: GET  /api/loan-reports/collection            — ລາຍງານການເກັບ
 * R4: GET  /api/loan-reports/portfolio             — Portfolio summary
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const { requirePermission } = require('../middleware/rbac');
const sequelize = db.sequelize;

// ═══════════════════════════════════════════
// R1: ECL IFRS 9 — Populate loan_ecl_staging
// ═══════════════════════════════════════════
router.post('/loan-reports/ecl-calculate', requirePermission('ສົ່ງອອກລາຍງານ'), async (_req, res) => {
    const t = await sequelize.transaction();
    try {
        // Get ECL parameters
        const [params] = await sequelize.query(
            `SELECT * FROM ecl_parameters ORDER BY loan_category, stage`, { transaction: t }
        );

        // Get active contracts with DPD
        const [contracts] = await sequelize.query(`
            SELECT lc.id, lc.contract_no, lc.remaining_balance, lc.days_past_due,
                   CASE WHEN lc.days_past_due <= 0 THEN 1
                        WHEN lc.days_past_due <= 30 THEN 1
                        WHEN lc.days_past_due <= 90 THEN 2
                        ELSE 3 END AS ecl_stage
            FROM loan_contracts lc
            WHERE lc.loan_status = 'ACTIVE'
            ORDER BY lc.id
        `, { transaction: t });

        // Get existing previous stages
        const [existing] = await sequelize.query(`
            SELECT loan_id, stage AS previous_stage FROM loan_ecl_staging
            WHERE (loan_id, assessment_date) IN (
                SELECT loan_id, MAX(assessment_date) FROM loan_ecl_staging GROUP BY loan_id
            )
        `, { transaction: t });
        const prevMap = {};
        existing.forEach(e => { prevMap[e.loan_id] = e.previous_stage; });

        const today = new Date().toISOString().split('T')[0];
        const results = [];
        let totalEcl = 0;

        for (const c of contracts) {
            const stage = c.ecl_stage;
            // Find matching params (default to 'individual' category)
            const param = params.find(p => p.loan_category === 'individual' && p.stage === stage)
                || params.find(p => p.stage === stage);

            if (!param) continue;

            const pd = parseFloat(param.pd_rate);
            const lgd = parseFloat(param.lgd_rate);
            const ead = parseFloat(c.remaining_balance);
            const ecl = Math.round(pd * lgd * ead * 100) / 100;
            const prevStage = prevMap[c.id] || null;
            totalEcl += ecl;

            // Upsert into loan_ecl_staging
            await sequelize.query(`
                INSERT INTO loan_ecl_staging
                    (loan_id, assessment_date, stage, days_past_due,
                     probability_of_default, loss_given_default, exposure_at_default,
                     ecl_amount, previous_stage, created_at, updated_at)
                VALUES (:loanId, :date, :stage, :dpd, :pd, :lgd, :ead, :ecl, :prev, NOW(), NOW())
                ON CONFLICT (loan_id, assessment_date) DO UPDATE SET
                    stage = :stage, days_past_due = :dpd,
                    probability_of_default = :pd, loss_given_default = :lgd,
                    exposure_at_default = :ead, ecl_amount = :ecl,
                    previous_stage = :prev, updated_at = NOW()
            `, {
                replacements: {
                    loanId: c.id, date: today, stage, dpd: c.days_past_due,
                    pd, lgd, ead, ecl, prev: prevStage,
                },
                transaction: t,
            });

            results.push({
                contractNo: c.contract_no,
                remainingBalance: ead,
                daysPastDue: c.days_past_due,
                stage,
                pd: `${(pd * 100).toFixed(1)}%`,
                lgd: `${(lgd * 100).toFixed(1)}%`,
                ead,
                ecl,
                previousStage: prevStage,
            });
        }

        await t.commit();
        res.json({
            status: true,
            message: `✅ ECL: ${results.length} ສັນຍາ, ລວມ ${totalEcl.toLocaleString()} ₭`,
            data: { totalEcl, contracts: results },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ status: false, message: err.message });
    }
});

// R1: GET ECL staging
router.get('/loan-reports/ecl-staging', async (_req, res) => {
    try {
        const [rows] = await sequelize.query(`
            SELECT les.*, lc.contract_no
            FROM loan_ecl_staging les
            JOIN loan_contracts lc ON lc.id = les.loan_id
            ORDER BY les.assessment_date DESC, les.loan_id
        `);
        res.json({ status: true, data: rows });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// R2: GL + Trial Balance — Close Period
// ═══════════════════════════════════════════
router.post('/loan-reports/close-period', requirePermission('ແກ້ໄຂບັນຊີ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { periodId } = req.body;
        if (!periodId) throw new Error('ກະລຸນາລະບຸ periodId');

        // Get period
        const [periods] = await sequelize.query(
            `SELECT * FROM fiscal_periods WHERE id = :id`,
            { replacements: { id: periodId }, transaction: t }
        );
        if (!periods.length) throw new Error('ບໍ່ພົບງວດ');
        const period = periods[0];

        // Aggregate JE lines within period
        const [balances] = await sequelize.query(`
            SELECT coa.account_code,
                   COALESCE(SUM(jel.debit), 0) AS period_debit,
                   COALESCE(SUM(jel.credit), 0) AS period_credit
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel.journal_entry_id
            JOIN chart_of_accounts coa ON coa.id = jel.account_id
            WHERE je.transaction_date >= :start AND je.transaction_date <= :end
              AND je.status = 'POSTED'
            GROUP BY coa.account_code
            ORDER BY coa.account_code
        `, {
            replacements: { start: period.start_date, end: period.end_date },
            transaction: t,
        });

        // Get previous period closing (if any)
        const [prevBalances] = await sequelize.query(`
            SELECT account_code, closing_debit, closing_credit
            FROM gl_balances WHERE fiscal_period_id = :prevId
        `, { replacements: { prevId: periodId - 1 }, transaction: t });
        const prevMap = {};
        prevBalances.forEach(b => { prevMap[b.account_code] = b; });

        // Delete existing records for this period
        await sequelize.query(
            `DELETE FROM gl_balances WHERE fiscal_period_id = :pid`,
            { replacements: { pid: periodId }, transaction: t }
        );

        let insertCount = 0;
        for (const b of balances) {
            const prev = prevMap[b.account_code] || { closing_debit: 0, closing_credit: 0 };
            const openDr = parseFloat(prev.closing_debit || 0);
            const openCr = parseFloat(prev.closing_credit || 0);
            const pDr = parseFloat(b.period_debit);
            const pCr = parseFloat(b.period_credit);

            await sequelize.query(`
                INSERT INTO gl_balances
                    (account_code, fiscal_period_id, opening_debit, opening_credit,
                     period_debit, period_credit, closing_debit, closing_credit,
                     created_at, updated_at)
                VALUES (:code, :pid, :oDr, :oCr, :pDr, :pCr, :cDr, :cCr, NOW(), NOW())
            `, {
                replacements: {
                    code: b.account_code, pid: periodId,
                    oDr: openDr, oCr: openCr, pDr, pCr,
                    cDr: openDr + pDr, cCr: openCr + pCr,
                },
                transaction: t,
            });
            insertCount++;
        }

        // Update period status
        await sequelize.query(
            `UPDATE fiscal_periods SET status = 'closed', closed_at = NOW() WHERE id = :id`,
            { replacements: { id: periodId }, transaction: t }
        );

        // Insert period_close_log
        await sequelize.query(`
            INSERT INTO period_close_log (fiscal_period_id, closed_by, closed_at, action, notes)
            VALUES (:pid, 1, NOW(), 'CLOSE', :notes)
        `, {
            replacements: { pid: periodId, notes: `GL: ${insertCount} accounts processed` },
            transaction: t,
        });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ປິດງວດ ${period.period_name}: ${insertCount} ບັນຊີ`,
            data: { periodName: period.period_name, accountsProcessed: insertCount },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ status: false, message: err.message });
    }
});

// R2: GET Trial Balance
router.get('/loan-reports/trial-balance/:periodId', async (req, res) => {
    try {
        const [rows] = await sequelize.query(`
            SELECT gb.account_code, coa.account_name_la, coa.account_name_en,
                   coa.account_type,
                   gb.opening_debit, gb.opening_credit,
                   gb.period_debit, gb.period_credit,
                   gb.closing_debit, gb.closing_credit
            FROM gl_balances gb
            JOIN chart_of_accounts coa ON coa.account_code = gb.account_code
            WHERE gb.fiscal_period_id = :pid
            ORDER BY gb.account_code
        `, { replacements: { pid: req.params.periodId } });

        const totals = rows.reduce((acc, r) => ({
            openDr: acc.openDr + parseFloat(r.opening_debit || 0),
            openCr: acc.openCr + parseFloat(r.opening_credit || 0),
            periodDr: acc.periodDr + parseFloat(r.period_debit || 0),
            periodCr: acc.periodCr + parseFloat(r.period_credit || 0),
            closeDr: acc.closeDr + parseFloat(r.closing_debit || 0),
            closeCr: acc.closeCr + parseFloat(r.closing_credit || 0),
        }), { openDr: 0, openCr: 0, periodDr: 0, periodCr: 0, closeDr: 0, closeCr: 0 });

        res.json({
            status: true,
            data: { rows, totals, balanced: Math.abs(totals.closeDr - totals.closeCr) < 0.01 },
        });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// R4: Collection Report
// ═══════════════════════════════════════════
router.get('/loan-reports/collection', async (_req, res) => {
    try {
        // Outstanding by NPL grade
        const [byGrade] = await sequelize.query(`
            SELECT lcl.code AS grade, lcl.value AS label,
                   COUNT(lc.id) AS contracts,
                   COALESCE(SUM(lc.remaining_balance), 0) AS outstanding,
                   COALESCE(SUM(lc.allowance_losses), 0) AS allowance
            FROM loan_classifications lcl
            LEFT JOIN loan_contracts lc ON lc.classification_id = lcl.id AND lc.loan_status = 'ACTIVE'
            WHERE lcl.code IN ('A','B','C','D','E')
            GROUP BY lcl.id, lcl.code, lcl.value ORDER BY lcl.id
        `);

        // Overdue aging
        const [aging] = await sequelize.query(`
            SELECT
                CASE
                    WHEN (CURRENT_DATE - lrs.due_date) <= 30 THEN '1-30'
                    WHEN (CURRENT_DATE - lrs.due_date) <= 60 THEN '31-60'
                    WHEN (CURRENT_DATE - lrs.due_date) <= 90 THEN '61-90'
                    WHEN (CURRENT_DATE - lrs.due_date) <= 180 THEN '91-180'
                    ELSE '>180'
                END AS bucket,
                COUNT(*) AS installments,
                SUM(lrs.total_amount - lrs.paid_amount) AS overdue_amount
            FROM loan_repayment_schedules lrs
            JOIN loan_contracts lc ON lc.id = lrs.contract_id
            WHERE lrs.status IN ('SCHEDULED','PARTIAL')
              AND lrs.due_date < CURRENT_DATE
              AND lc.loan_status = 'ACTIVE'
            GROUP BY bucket ORDER BY bucket
        `);

        // Collection this month
        const [monthlyCollection] = await sequelize.query(`
            SELECT COUNT(*) AS payments,
                   COALESCE(SUM(amount_paid), 0) AS total_collected,
                   COALESCE(SUM(principal_paid), 0) AS principal,
                   COALESCE(SUM(interest_paid), 0) AS interest,
                   COALESCE(SUM(penalty_paid), 0) AS penalty
            FROM loan_transactions
            WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
        `);

        // Top delinquent
        const [delinquent] = await sequelize.query(`
            SELECT lc.contract_no, lc.remaining_balance, lc.days_past_due,
                   lcl.code AS grade,
                   COUNT(lrs.id) AS overdue_installments,
                   SUM(lrs.total_amount - lrs.paid_amount) AS overdue_amount
            FROM loan_contracts lc
            JOIN loan_classifications lcl ON lcl.id = lc.classification_id
            LEFT JOIN loan_repayment_schedules lrs ON lrs.contract_id = lc.id
                AND lrs.status IN ('SCHEDULED','PARTIAL') AND lrs.due_date < CURRENT_DATE
            WHERE lc.loan_status = 'ACTIVE' AND lc.days_past_due > 0
            GROUP BY lc.id, lc.contract_no, lc.remaining_balance, lc.days_past_due, lcl.code
            ORDER BY lc.days_past_due DESC LIMIT 10
        `);

        // Portfolio summary
        const [portfolio] = await sequelize.query(`
            SELECT COUNT(*) AS total_loans,
                   SUM(approved_amount) AS total_disbursed,
                   SUM(remaining_balance) AS total_outstanding,
                   SUM(approved_amount - remaining_balance) AS total_repaid,
                   ROUND(SUM(approved_amount - remaining_balance) / NULLIF(SUM(approved_amount), 0) * 100, 1) AS repayment_rate,
                   COUNT(*) FILTER (WHERE days_past_due > 30) AS npl_count,
                   ROUND(COUNT(*) FILTER (WHERE days_past_due > 30)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS npl_ratio
            FROM loan_contracts WHERE loan_status = 'ACTIVE'
        `);

        res.json({
            status: true,
            data: {
                portfolio: portfolio[0],
                byGrade,
                aging,
                monthlyCollection: monthlyCollection[0],
                delinquent,
            },
        });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// Portfolio history
router.get('/loan-reports/portfolio', async (_req, res) => {
    try {
        const [products] = await sequelize.query(`
            SELECT lp.product_name_la, lp.interest_rate_type,
                   COUNT(lc.id) AS contracts,
                   COALESCE(SUM(lc.approved_amount), 0) AS total_approved,
                   COALESCE(SUM(lc.remaining_balance), 0) AS total_outstanding
            FROM loan_products lp
            LEFT JOIN loan_contracts lc ON lc.product_id = lp.id AND lc.loan_status = 'ACTIVE'
            GROUP BY lp.id, lp.product_name_la, lp.interest_rate_type
            ORDER BY lp.id
        `);

        res.json({ status: true, data: { products } });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
