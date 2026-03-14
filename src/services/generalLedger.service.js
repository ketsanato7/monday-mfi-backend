/**
 * generalLedger.service.js — GL ledger with running balance + accounts list
 */
const { Op } = require('sequelize');
const db = require('../models');
const JE = db['journal_entries'], JEL = db['journal_entry_lines'], COA = db['chart_of_accounts'];

class GeneralLedgerService {
    static async ledger(query) {
        const { account_code, from, to, page = 1, limit = 100 } = query;
        if (!account_code) throw Object.assign(new Error('ກະລຸນາລະບຸ account_code'), { status: 400 });
        let accountInfo = null, accountId = null;
        if (COA) { const a = await COA.findOne({ where: { account_code }, raw: true }); if (a) { accountId = a.id; accountInfo = { id: a.id, account_code: a.account_code, account_name: a.account_name_la || a.account_code, account_type: a.account_type || a.coa_type || '' }; } }
        let openBal = 0;
        if (from && accountId) { const oe = await JE.findAll({ where: { transaction_date: { [Op.lt]: from }, status: 'POSTED' }, attributes: ['id'], raw: true }); const oids = oe.map(e => e.id); if (oids.length) { const ol = await JEL.findAll({ where: { journal_entry_id: { [Op.in]: oids }, account_id: accountId }, raw: true }); ol.forEach(l => { openBal += parseFloat(l.debit||0) - parseFloat(l.credit||0); }); } }
        const ew = { status: 'POSTED' }; if (from || to) { ew.transaction_date = {}; if (from) ew.transaction_date[Op.gte] = from; if (to) ew.transaction_date[Op.lte] = to; }
        const entries = await JE.findAll({ where: ew, order: [['transaction_date','ASC'],['id','ASC']], raw: true }); const ids = entries.map(e => e.id); const em = {}; entries.forEach(e => { em[e.id] = e; });
        let lines = []; if (ids.length && accountId) lines = await JEL.findAll({ where: { journal_entry_id: { [Op.in]: ids }, account_id: accountId }, order: [['id','ASC']], raw: true });
        let run = openBal;
        const data = lines.map(l => { const e = em[l.journal_entry_id] || {}, dr = parseFloat(l.debit||0), cr = parseFloat(l.credit||0); run += dr - cr; return { id: l.id, transaction_date: e.transaction_date, reference_no: e.reference_no || '', description: l.description || e.description || '', debit: dr, credit: cr, running_balance: run, journal_entry_id: l.journal_entry_id, status: e.status }; });
        const pn = +page, ln = +limit, total = data.length, tp = Math.ceil(total/ln), off = (pn-1)*ln;
        const tDr = data.reduce((s,l) => s+l.debit,0), tCr = data.reduce((s,l) => s+l.credit,0);
        return { success: true, account: accountInfo || { account_code, account_name: account_code }, summary: { opening_balance: openBal, total_debit: tDr, total_credit: tCr, net_movement: tDr-tCr, closing_balance: openBal+tDr-tCr, entries_count: total }, data: data.slice(off, off+ln), pagination: { page: pn, limit: ln, total_records: total, total_pages: tp } };
    }
    static async accounts() {
        if (!COA) return { success: true, data: [] };
        return { success: true, data: (await COA.findAll({ order: [['account_code','ASC']], raw: true })).map(a => ({ id: a.id, account_code: a.account_code, account_name: a.account_name_la || a.account_code, account_type: a.account_type || a.coa_type || '', level: a.level || 0 })) };
    }
}

module.exports = GeneralLedgerService;
