/**
 * str-detection.routes.js — STR/AML Detection API
 * 
 * Endpoints for scanning loans, reviewing STR alerts, 
 * and generating BoL compliance reports.
 */
const router = require('express').Router();
const { requireAuth } = require('../middleware/rbac');
const { scanLoan, scanAllLoans, getStrDashboard, STR_RULES } = require('../engines/strDetection');
const db = require('../models');
const sequelize = db.sequelize;

// ─── GET STR Dashboard ───
router.get('/str/dashboard', requireAuth, async (req, res) => {
    try {
        const dashboard = await getStrDashboard();
        res.json({ status: true, data: dashboard });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Scan Single Loan ───
router.get('/str/scan/:loanId', requireAuth, async (req, res) => {
    try {
        const alerts = await scanLoan(req.params.loanId);
        res.json({
            status: true,
            data: {
                loanId: req.params.loanId,
                alertCount: alerts.length,
                riskLevel: alerts.some(a => a.severity === 'HIGH') ? 'HIGH'
                    : alerts.some(a => a.severity === 'MEDIUM') ? 'MEDIUM'
                        : alerts.length > 0 ? 'LOW' : 'CLEAR',
                alerts,
            },
        });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Scan ALL Active Loans ───
router.post('/str/scan-all', requireAuth, async (req, res) => {
    try {
        const result = await scanAllLoans();
        res.json({ status: true, data: result });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Get STR Reports (pending + submitted) ───
router.get('/str/reports', requireAuth, async (req, res) => {
    try {
        const [reports] = await sequelize.query(`
            SELECT ar.*, lc.contract_no,
                   pi.firstname__la, pi.lastname__la
            FROM amlio_reports ar
            LEFT JOIN loan_contracts lc ON lc.id = ar.reference_id
            LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
            LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
            WHERE ar.report_type = 'STR'
            ORDER BY ar.created_at DESC
            LIMIT 100
        `);
        res.json({ status: true, data: reports });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Submit STR to BoL ───
router.put('/str/submit/:reportId', requireAuth, async (req, res) => {
    try {
        await sequelize.query(`
            UPDATE amlio_reports SET status = 'SUBMITTED', 
            description = description || ' | Submitted ' || NOW()::text
            WHERE id = $1 AND report_type = 'STR'
        `, { bind: [req.params.reportId] });
        res.json({ status: true, message: 'STR ສົ່ງ BoL ສຳ ເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Get All Rules (for frontend display) ───
router.get('/str/rules', requireAuth, async (req, res) => {
    res.json({ status: true, data: STR_RULES });
});

// ═══════════════════════════════
// BoL Monthly Report Generator
// ═══════════════════════════════
router.get('/bol-report/monthly', requireAuth, async (req, res) => {
    try {
        const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
        const [startDate] = month.split('-').length === 2 ? [`${month}-01`] : [month];

        // Loan summary
        const [loanSummary] = await sequelize.query(`
            SELECT 
                COUNT(*) as total_loans,
                COALESCE(SUM(CASE WHEN loan_status = 'ACTIVE' THEN 1 ELSE 0 END), 0) as active,
                COALESCE(SUM(CASE WHEN loan_status = 'PENDING' THEN 1 ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN loan_status = 'CLOSED' THEN 1 ELSE 0 END), 0) as closed,
                COALESCE(SUM(approved_amount), 0) as total_portfolio,
                COALESCE(SUM(remaining_balance), 0) as outstanding_balance,
                COALESCE(AVG(interest_rate), 0) as avg_interest
            FROM loan_contracts
        `);

        // Disbursements this month
        const [disbursements] = await sequelize.query(`
            SELECT COUNT(*) as count, COALESCE(SUM(approved_amount), 0) as amount
            FROM loan_contracts
            WHERE disbursement_date >= $1::date
            AND disbursement_date < ($1::date + INTERVAL '1 month')
        `, { bind: [startDate] });

        // Overdue stats
        const [overdue] = await sequelize.query(`
            SELECT 
                COUNT(DISTINCT lc.id) as overdue_loans,
                COALESCE(SUM(lrs.principal + lrs.interest), 0) as overdue_amount
            FROM loan_repayment_schedules lrs
            JOIN loan_contracts lc ON lc.id = lrs.contract_id
            WHERE lrs.is_paid = false AND lrs.due_date < NOW()
        `);

        // AML summary
        const [aml] = await sequelize.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN report_type = 'CTR' THEN 1 ELSE 0 END), 0) as ctr_count,
                COALESCE(SUM(CASE WHEN report_type = 'STR' THEN 1 ELSE 0 END), 0) as str_count,
                COALESCE(SUM(CASE WHEN report_type = 'STR' AND status = 'PENDING' THEN 1 ELSE 0 END), 0) as str_pending
            FROM amlio_reports
        `);

        res.json({
            status: true,
            data: {
                month,
                loan_summary: loanSummary[0],
                disbursements: disbursements[0],
                overdue: overdue[0],
                aml: aml[0],
                generated_at: new Date().toISOString(),
            },
        });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
