/**
 * accountingEngine.service.js — Financial Statements, Loan Limits, Audit
 */
const db = require('../models');
const seq = db.sequelize;

class AccountingEngineService {
    static async generateFS({ statementType = 'BS', periodId }) {
        if (!periodId) throw Object.assign(new Error('periodId required'), { status: 400 });
        const t = await seq.transaction();
        try {
            const [period] = await seq.query(`SELECT id, period_name, start_date, end_date, status FROM fiscal_periods WHERE id = $1`, { bind: [periodId], type: seq.QueryTypes.SELECT, transaction: t });
            if (!period) { await t.rollback(); throw Object.assign(new Error('Period not found'), { status: 404 }); }

            const [oldFs] = await seq.query(`SELECT id FROM financial_statements WHERE statement_type = $1 AND fiscal_period_id = $2`, { bind: [statementType, periodId], type: seq.QueryTypes.SELECT, transaction: t });
            if (oldFs) {
                await seq.query(`DELETE FROM financial_statement_lines WHERE statement_id = $1`, { bind: [oldFs.id], transaction: t });
                await seq.query(`DELETE FROM financial_statements WHERE id = $1`, { bind: [oldFs.id], transaction: t });
            }

            const [fsResult] = await seq.query(`INSERT INTO financial_statements (statement_type, fiscal_period_id, generated_at, status, created_at, updated_at) VALUES ($1, $2, NOW(), 'GENERATED', NOW(), NOW()) RETURNING id`, { bind: [statementType, periodId], transaction: t });
            const fsId = fsResult[0].id;

            const isBS = statementType === 'BS';
            const types = isBS ? "'ASSET', 'LIABILITY', 'EQUITY'" : "'REVENUE', 'EXPENSE'";
            const dateFilter = isBS ? `AND je.transaction_date <= $2` : `AND je.transaction_date BETWEEN $3 AND $2`;
            const amountCalc = isBS
                ? `CASE WHEN coa.account_type = 'ASSET' THEN COALESCE(SUM(jel.debit),0)-COALESCE(SUM(jel.credit),0) ELSE COALESCE(SUM(jel.credit),0)-COALESCE(SUM(jel.debit),0) END`
                : `CASE WHEN coa.account_type = 'REVENUE' THEN COALESCE(SUM(jel.credit),0)-COALESCE(SUM(jel.debit),0) ELSE COALESCE(SUM(jel.debit),0)-COALESCE(SUM(jel.credit),0) END`;

            const sql = `INSERT INTO financial_statement_lines (statement_id, line_order, label_lo, label_en, account_code, amount, amount_previous, is_header, indent_level) SELECT $1, ROW_NUMBER() OVER (ORDER BY coa.account_code), coa.account_name_la, coa.account_name_en, coa.account_code, ${amountCalc}, 0, false, CASE WHEN coa.parent_account_id IS NULL THEN 0 ELSE 1 END FROM chart_of_accounts coa LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id ${dateFilter} AND je.status = 'POSTED' WHERE coa.account_type IN (${types}) AND coa.is_header = false GROUP BY coa.id, coa.account_code, coa.account_name_la, coa.account_name_en, coa.account_type, coa.parent_account_id HAVING COALESCE(SUM(jel.debit),0)+COALESCE(SUM(jel.credit),0)>0 ORDER BY coa.account_code`;

            const binds = isBS ? [fsId, period.end_date] : [fsId, period.end_date, period.start_date];
            await seq.query(sql, { bind: binds, transaction: t });

            const [cnt] = await seq.query(`SELECT COUNT(*) AS cnt FROM financial_statement_lines WHERE statement_id = $1`, { bind: [fsId], type: seq.QueryTypes.SELECT, transaction: t });
            const totals = await seq.query(`SELECT account_code, label_lo, amount FROM financial_statement_lines WHERE statement_id = $1 ORDER BY line_order LIMIT 20`, { bind: [fsId], type: seq.QueryTypes.SELECT, transaction: t });

            await t.commit();
            return { status: true, message: `${statementType} generated: ${cnt.cnt} lines`, data: { fsId, statementType, periodId, lines: parseInt(cnt.cnt), totals } };
        } catch (e) { await t.rollback(); throw e; }
    }

    static async listFS() {
        const rows = await seq.query(`SELECT fs.*, fp.period_name, fp.start_date, fp.end_date, (SELECT COUNT(*) FROM financial_statement_lines fsl WHERE fsl.statement_id = fs.id) AS line_count FROM financial_statements fs JOIN fiscal_periods fp ON fp.id = fs.fiscal_period_id ORDER BY fs.generated_at DESC`, { type: seq.QueryTypes.SELECT });
        return { status: true, data: rows };
    }

    static async getFSLines(id) {
        const rows = await seq.query(`SELECT * FROM financial_statement_lines WHERE statement_id = $1 ORDER BY line_order`, { bind: [id], type: seq.QueryTypes.SELECT });
        return { status: true, data: rows };
    }

    static async getLoanLimits() {
        const rows = await seq.query(`SELECT lal.*, r.name AS role_name FROM loan_approval_limits lal JOIN roles r ON r.id = lal.role_id ORDER BY lal.max_amount`, { type: seq.QueryTypes.SELECT });
        return { status: true, data: rows };
    }

    static async checkLoanLimit({ roleId, amount, currencyCode = 'LAK' }) {
        if (!roleId || !amount) throw Object.assign(new Error('roleId and amount required'), { status: 400 });
        const [limit] = await seq.query(`SELECT * FROM loan_approval_limits WHERE role_id = $1 AND currency_code = $2`, { bind: [roleId, currencyCode], type: seq.QueryTypes.SELECT });
        if (!limit) return { status: false, approved: false, message: 'ບໍ່ມີວົງເງິນອະນຸມັດ' };
        const approved = parseFloat(amount) <= parseFloat(limit.max_amount);
        return { status: true, approved, maxAmount: limit.max_amount, requestedAmount: amount, message: approved ? `✅ ອະນຸມັດໄດ້` : `❌ ເກີນວົງເງິນ` };
    }

    static async createAuditLog({ userId, action, tableName, recordId, oldValues, newValues, description }) {
        await seq.query(`INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`, { bind: [userId || null, action, tableName, recordId || null, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, description || null] });
        return { status: true, message: 'Audit logged' };
    }

    static async getAuditLogs({ table_name, action, limit = 100 }) {
        let where = '1=1'; const binds = [];
        if (table_name) { binds.push(table_name); where += ` AND table_name = $${binds.length}`; }
        if (action) { binds.push(action); where += ` AND action = $${binds.length}`; }
        binds.push(parseInt(limit));
        const rows = await seq.query(`SELECT al.*, u.username AS user_name FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE ${where} ORDER BY al.created_at DESC LIMIT $${binds.length}`, { bind: binds, type: seq.QueryTypes.SELECT });
        return { status: true, data: rows, total: rows.length };
    }
}

module.exports = AccountingEngineService;
