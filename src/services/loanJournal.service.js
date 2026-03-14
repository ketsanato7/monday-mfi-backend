/**
 * loanJournal.service.js — Loan Journal Ledger, Summary, Accounts
 */
const db = require('../models');
const { Op } = require('sequelize');

const JE = db['journal_entries'];
const JEL = db['journal_entry_lines'];
const COA = db['chart_of_accounts'];
const Loan = db['loans'];

class LoanJournalService {
    static async ledger(query) {
        const { loan_id, from, to, type, status, page = 1, limit = 200 } = query;
        const where = {};
        if (from || to) { where.transaction_date = {}; if (from) where.transaction_date[Op.gte] = from; if (to) where.transaction_date[Op.lte] = to; }
        if (loan_id) where.reference_no = { [Op.like]: `LOAN-%-${loan_id}-%` };
        if (type) { const map = { DISBURSEMENT: 'LOAN-DIS-%', REPAYMENT: 'LOAN-REP-%', PROVISION: 'LOAN-PRV-%' }; if (map[type]) where.reference_no = { ...(where.reference_no || {}), [Op.like]: map[type] }; }
        if (status) where.status = status;
        if (!loan_id && !type) where.reference_no = { [Op.like]: 'LOAN-%' };
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows: entries } = await JE.findAndCountAll({ where, order: [['transaction_date', 'DESC'], ['id', 'DESC']], limit: parseInt(limit), offset });
        const ids = entries.map(e => e.id);
        let lines = [];
        if (ids.length) lines = await JEL.findAll({ where: { journal_entry_id: { [Op.in]: ids } }, order: [['journal_entry_id', 'ASC'], ['id', 'ASC']], raw: true });
        const codes = [...new Set(lines.map(l => l.account_code))];
        let acctMap = {};
        if (codes.length) { const accts = await COA.findAll({ where: { account_code: { [Op.in]: codes } }, attributes: ['account_code', 'account_name'], raw: true }); acctMap = accts.reduce((m, a) => { m[a.account_code] = a.account_name; return m; }, {}); }
        const data = []; let tDr = 0, tCr = 0;
        for (const e of entries) {
            const el = lines.filter(l => l.journal_entry_id === e.id).map(l => ({ line_id: l.id, account_code: l.account_code, account_name: acctMap[l.account_code] || l.account_code, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, description: l.description || '' }));
            const eDr = el.reduce((s, l) => s + l.debit, 0), eCr = el.reduce((s, l) => s + l.credit, 0);
            tDr += eDr; tCr += eCr;
            let txn = 'OTHER'; const ref = e.reference_no || ''; if (ref.includes('LOAN-DIS')) txn = 'DISBURSEMENT'; else if (ref.includes('LOAN-REP')) txn = 'REPAYMENT'; else if (ref.includes('LOAN-PRV')) txn = 'PROVISION';
            data.push({ id: e.id, transaction_date: e.transaction_date, reference_no: e.reference_no, description: e.description, status: e.status, transaction_type: txn, total_debit: eDr, total_credit: eCr, is_balanced: Math.abs(eDr - eCr) < 0.01, lines: el });
        }
        let loan = null;
        if (loan_id) { const l = await Loan.findByPk(loan_id, { raw: true }); if (l) loan = { id: l.id, account_number: l.account_number, approved_balance: parseFloat(l.approved_balance) || 0, remaining_balance: parseFloat(l.remaining_balance) || 0, interest_rate: parseFloat(l.interest_rate) || 0, loan_status: l.loan_status, from_date: l.from_date, to_date: l.to_date, currency_code: l.currency_code || 'LAK' }; }
        return { data, summary: { total_debit: tDr, total_credit: tCr, is_balanced: Math.abs(tDr - tCr) < 0.01, entry_count: count }, loan, pagination: { page: parseInt(page), limit: parseInt(limit), total: count, totalPages: Math.ceil(count / parseInt(limit)) }, status: true, message: 'Select successfully' };
    }

    static async summary(query) {
        const { from, to } = query;
        const where = { reference_no: { [Op.like]: 'LOAN-%' } };
        if (from || to) { where.transaction_date = {}; if (from) where.transaction_date[Op.gte] = from; if (to) where.transaction_date[Op.lte] = to; }
        const entries = await JE.findAll({ where, raw: true });
        const ids = entries.map(e => e.id);
        let d = 0, rp = 0, ri = 0, pen = 0, prov = 0;
        if (ids.length) {
            const lines = await JEL.findAll({ where: { journal_entry_id: { [Op.in]: ids } }, raw: true });
            for (const e of entries) {
                const ref = e.reference_no || '', el = lines.filter(l => l.journal_entry_id === e.id);
                if (ref.includes('LOAN-DIS')) d += el.filter(l => l.account_code?.startsWith('11')).reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
                else if (ref.includes('LOAN-REP')) { rp += el.filter(l => l.account_code?.startsWith('11')).reduce((s, l) => s + (parseFloat(l.credit) || 0), 0); ri += el.filter(l => l.account_code?.startsWith('41')).reduce((s, l) => s + (parseFloat(l.credit) || 0), 0); pen += el.filter(l => l.account_code?.startsWith('42')).reduce((s, l) => s + (parseFloat(l.credit) || 0), 0); }
                else if (ref.includes('LOAN-PRV')) prov += el.filter(l => l.account_code?.startsWith('62')).reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
            }
        }
        return { data: { total_disbursement: d, total_repayment_principal: rp, total_repayment_interest: ri, total_penalty: pen, total_provision: prov, net_loan_outstanding: d - rp, entry_count: entries.length }, status: true, message: 'Summary generated successfully' };
    }

    static async accounts() {
        const prefixes = ['1110', '1120', '1130', '4111', '4112', '4210', '4220', '6210', '1010', '1030'];
        return { data: await COA.findAll({ where: { account_code: { [Op.or]: prefixes.map(c => ({ [Op.like]: `${c}%` })) } }, order: [['account_code', 'ASC']], raw: true }), status: true };
    }
}

module.exports = LoanJournalService;
