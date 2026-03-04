/**
 * accounting.engine.routes.js
 * U1: Generate Financial Statements (BS/PL → save to DB)
 * U2: Loan Approval Limits check
 * U3: Audit trail helper
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const { requirePermission } = require('../middleware/rbac');
const seq = db.sequelize;

// ═══════════════════════════════════════════
// U1: POST /accounting/generate-fs
// Generate & save Financial Statements snapshot
// ═══════════════════════════════════════════
router.post('/accounting/generate-fs', requirePermission('ແກ້ໄຂບັນຊີ'), async (req, res) => {
    const t = await seq.transaction();
    try {
        const { statementType = 'BS', periodId } = req.body;
        if (!periodId) return res.json({ status: false, message: 'periodId required' });

        // Check fiscal period exists
        const [period] = await seq.query(
            `SELECT id, period_name, start_date, end_date, status FROM fiscal_periods WHERE id = $1`,
            { bind: [periodId], type: seq.QueryTypes.SELECT, transaction: t }
        );
        if (!period) { await t.rollback(); return res.json({ status: false, message: 'Period not found' }); }

        // Delete old FS for same type/period
        const [oldFs] = await seq.query(
            `SELECT id FROM financial_statements WHERE statement_type = $1 AND fiscal_period_id = $2`,
            { bind: [statementType, periodId], type: seq.QueryTypes.SELECT, transaction: t }
        );
        if (oldFs) {
            await seq.query(`DELETE FROM financial_statement_lines WHERE statement_id = $1`, { bind: [oldFs.id], transaction: t });
            await seq.query(`DELETE FROM financial_statements WHERE id = $1`, { bind: [oldFs.id], transaction: t });
        }

        // Create FS header
        const [fsResult] = await seq.query(
            `INSERT INTO financial_statements (statement_type, fiscal_period_id, generated_at, status, created_at, updated_at)
             VALUES ($1, $2, NOW(), 'GENERATED', NOW(), NOW()) RETURNING id`,
            { bind: [statementType, periodId], transaction: t }
        );
        const fsId = fsResult[0].id;

        // Generate lines based on type
        let linesSql;
        if (statementType === 'BS') {
            // Balance Sheet: ASSET, LIABILITY, EQUITY
            linesSql = `
                INSERT INTO financial_statement_lines 
                    (statement_id, line_order, label_lo, label_en, account_code, amount, amount_previous, is_header, indent_level)
                SELECT 
                    $1,
                    ROW_NUMBER() OVER (ORDER BY coa.account_code),
                    coa.account_name_la,
                    coa.account_name_en,
                    coa.account_code,
                    CASE 
                        WHEN coa.account_type = 'ASSET' THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
                        ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
                    END,
                    0,
                    false,
                    CASE WHEN coa.parent_account_id IS NULL THEN 0 ELSE 1 END
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
                LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id 
                    AND je.transaction_date <= $2 AND je.status = 'POSTED'
                WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
                    AND coa.is_header = false
                GROUP BY coa.id, coa.account_code, coa.account_name_la, coa.account_name_en, coa.account_type, coa.parent_account_id
                HAVING COALESCE(SUM(jel.debit), 0) + COALESCE(SUM(jel.credit), 0) > 0
                ORDER BY coa.account_code`;
        } else {
            // Income Statement (PL): REVENUE, EXPENSE
            linesSql = `
                INSERT INTO financial_statement_lines 
                    (statement_id, line_order, label_lo, label_en, account_code, amount, amount_previous, is_header, indent_level)
                SELECT 
                    $1,
                    ROW_NUMBER() OVER (ORDER BY coa.account_code),
                    coa.account_name_la,
                    coa.account_name_en,
                    coa.account_code,
                    CASE 
                        WHEN coa.account_type = 'REVENUE' THEN COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
                        ELSE COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
                    END,
                    0,
                    false,
                    CASE WHEN coa.parent_account_id IS NULL THEN 0 ELSE 1 END
                FROM chart_of_accounts coa
                LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
                LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id 
                    AND je.transaction_date BETWEEN $3 AND $2 AND je.status = 'POSTED'
                WHERE coa.account_type IN ('REVENUE', 'EXPENSE')
                    AND coa.is_header = false
                GROUP BY coa.id, coa.account_code, coa.account_name_la, coa.account_name_en, coa.account_type, coa.parent_account_id
                HAVING COALESCE(SUM(jel.debit), 0) + COALESCE(SUM(jel.credit), 0) > 0
                ORDER BY coa.account_code`;
        }

        if (statementType === 'BS') {
            await seq.query(linesSql, { bind: [fsId, period.end_date], transaction: t });
        } else {
            await seq.query(linesSql, { bind: [fsId, period.end_date, period.start_date], transaction: t });
        }

        // Count lines
        const [countResult] = await seq.query(
            `SELECT COUNT(*) AS cnt FROM financial_statement_lines WHERE statement_id = $1`,
            { bind: [fsId], type: seq.QueryTypes.SELECT, transaction: t }
        );

        // Summary totals
        const totals = await seq.query(
            `SELECT account_code, label_lo, amount 
             FROM financial_statement_lines WHERE statement_id = $1 ORDER BY line_order LIMIT 20`,
            { bind: [fsId], type: seq.QueryTypes.SELECT, transaction: t }
        );

        await t.commit();
        res.json({
            status: true,
            message: `${statementType} generated: ${countResult.cnt} lines`,
            data: { fsId, statementType, periodId, lines: parseInt(countResult.cnt), totals }
        });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ status: false, message: e.message });
    }
});

// GET /accounting/financial-statements — list generated FS
router.get('/accounting/financial-statements', async (req, res) => {
    try {
        const rows = await seq.query(`
            SELECT fs.*, fp.period_name, fp.start_date, fp.end_date,
                   (SELECT COUNT(*) FROM financial_statement_lines fsl WHERE fsl.statement_id = fs.id) AS line_count
            FROM financial_statements fs
            JOIN fiscal_periods fp ON fp.id = fs.fiscal_period_id
            ORDER BY fs.generated_at DESC
        `, { type: seq.QueryTypes.SELECT });
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// GET /accounting/financial-statements/:id/lines — get lines for a FS
router.get('/accounting/financial-statements/:id/lines', async (req, res) => {
    try {
        const rows = await seq.query(`
            SELECT * FROM financial_statement_lines WHERE statement_id = $1 ORDER BY line_order
        `, { bind: [req.params.id], type: seq.QueryTypes.SELECT });
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// U2: Loan Approval Limits
// ═══════════════════════════════════════════

// GET /loan-approval/limits — list limits
router.get('/loan-approval/limits', async (req, res) => {
    try {
        const rows = await seq.query(`
            SELECT lal.*, r.name AS role_name 
            FROM loan_approval_limits lal 
            JOIN roles r ON r.id = lal.role_id
            ORDER BY lal.max_amount
        `, { type: seq.QueryTypes.SELECT });
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// POST /loan-approval/check — check if amount is within limits for a role
router.post('/loan-approval/check', requirePermission('ອະນຸມັດສິນເຊື່ອ'), async (req, res) => {
    try {
        const { roleId, amount, currencyCode = 'LAK' } = req.body;
        if (!roleId || !amount) return res.json({ status: false, message: 'roleId and amount required' });

        const [limit] = await seq.query(`
            SELECT * FROM loan_approval_limits 
            WHERE role_id = $1 AND currency_code = $2
        `, { bind: [roleId, currencyCode], type: seq.QueryTypes.SELECT });

        if (!limit) {
            return res.json({ status: false, approved: false, message: 'ບໍ່ມີວົງເງິນອະນຸມັດສຳລັບບົດບາດນີ້' });
        }

        const approved = parseFloat(amount) <= parseFloat(limit.max_amount);
        res.json({
            status: true,
            approved,
            maxAmount: limit.max_amount,
            requestedAmount: amount,
            message: approved
                ? `✅ ອະນຸມັດໄດ້ (ວົງເງິນ: ${limit.max_amount} ${currencyCode})`
                : `❌ ເກີນວົງເງິນ (ສູງສຸດ: ${limit.max_amount} ${currencyCode})`
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// U3: Audit Log API
// ═══════════════════════════════════════════

// POST /audit/log — record an audit entry
router.post('/audit/log', requirePermission('ແກ້ໄຂບັນຊີ'), async (req, res) => {
    try {
        const { userId, action, tableName, recordId, oldValues, newValues, description } = req.body;
        await seq.query(`
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, description, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, {
            bind: [userId || null, action, tableName, recordId || null,
            oldValues ? JSON.stringify(oldValues) : null,
            newValues ? JSON.stringify(newValues) : null,
            description || null]
        });
        res.json({ status: true, message: 'Audit logged' });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// GET /audit/logs — list audit entries
router.get('/audit/logs', async (req, res) => {
    try {
        const { table_name, action, limit = 100 } = req.query;
        let where = '1=1';
        const binds = [];
        if (table_name) { binds.push(table_name); where += ` AND table_name = $${binds.length}`; }
        if (action) { binds.push(action); where += ` AND action = $${binds.length}`; }
        binds.push(parseInt(limit));

        const rows = await seq.query(`
            SELECT al.*, u.username AS user_name
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE ${where}
            ORDER BY al.created_at DESC
            LIMIT $${binds.length}
        `, { bind: binds, type: seq.QueryTypes.SELECT });
        res.json({ status: true, data: rows, total: rows.length });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

module.exports = router;
