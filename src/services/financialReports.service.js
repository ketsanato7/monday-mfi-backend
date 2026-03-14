/**
 * financialReports.service.js — BOL F01 (Trial Balance), F02 (Balance Sheet), F03 (Income Statement)
 */
const { Op, fn, col } = require('sequelize');
const db = require('../models');
const JE = db['journal_entries'], JEL = db['journal_entry_lines'], COA = db['chart_of_accounts'];

function catOf(code) { if (!code) return 'OTHER'; const p = code.charAt(0); return { '1':'ASSET','2':'LIABILITY','3':'EQUITY','4':'REVENUE','5':'EXPENSE' }[p] || 'OTHER'; }
function catLabel(c) { return { ASSET:'ຊັບສິນ', LIABILITY:'ໜີ້ສິນ', EQUITY:'ທຶນ', REVENUE:'ລາຍຮັບ', EXPENSE:'ຄ່າໃຊ້ຈ່າຍ' }[c] || 'ອື່ນໆ'; }

async function getBalances(asOfDate) {
    const w = { status: 'POSTED' }; if (asOfDate) w.transaction_date = { [Op.lte]: asOfDate };
    const entries = await JE.findAll({ where: w, attributes: ['id'], raw: true }); const ids = entries.map(e => e.id); if (!ids.length) return {};
    const grps = await JEL.findAll({ where: { journal_entry_id: { [Op.in]: ids } }, attributes: ['account_id', [fn('SUM', col('debit')), 'total_debit'], [fn('SUM', col('credit')), 'total_credit']], group: ['account_id'], raw: true });
    const accts = await COA.findAll({ where: { id: grps.map(g => g.account_id) }, raw: true }); const am = {}; accts.forEach(a => { am[a.id] = a; });
    const b = {};
    grps.forEach(g => { const a = am[g.account_id]; if (!a) return; const cat = catOf(a.account_code), dr = parseFloat(g.total_debit||0), cr = parseFloat(g.total_credit||0); b[g.account_id] = { account_id: g.account_id, account_code: a.account_code, account_name: a.account_name_la || a.account_code, category: cat, category_label: catLabel(cat), debit: dr, credit: cr, balance: (cat==='ASSET'||cat==='EXPENSE') ? dr-cr : cr-dr }; });
    return b;
}

const F02_ROWS = [{ code:'1',label:'ເງິນສົດ ແລະ ເງິນຝາກຢູ່ທະນາຄານແຫ່ງ ສປປ ລາວ',h:true},{code:'1.1',label:'ເງິນສົດ ແລະ ທີ່ຖືວ່າຄືເງິນສົດ'},{code:'1.2',label:'ເງິນຝາກບໍ່ມີກຳນົດ'},{code:'1.3',label:'ເງິນຝາກມີກຳນົດ'},{code:'2',label:'ໜີ້ຕ້ອງຮັບຈາກສະຖາບັນການເງິນອື່ນ',h:true},{code:'5',label:'ສິນເຊື່ອ ແລະ ເງິນລ່ວງໜ້າໃຫ້ລູກຄ້າສຸດທິ',h:true},{code:'5.1',label:'ໜີ້ປົກກະຕິ'},{code:'5.2',label:'ໜີ້ຄວນເອົາໃຈໃສ່'},{code:'5.3',label:'ໜີ້ທວງຍາກຈາກລູກຄ້າ'},{code:'5.4',label:'ເງິນແຮຄ່າເຊື່ອມໜີ້ທວງຍາກ'},{code:'8',label:'ຊັບສົມບັດຄົງທີ່ສຸດທິ',h:true},{code:'I',label:'ຊັບສິນທັງໝົດ',h:true},{code:'12',label:'ໜີ້ຕ້ອງສົ່ງໃຫ້ລູກຄ້າ',h:true},{code:'12.1',label:'ເງິນຮັບຝາກບໍ່ມີກຳນົດ'},{code:'12.2',label:'ເງິນຮັບຝາກມີກຳນົດ'},{code:'16',label:'ທຶນ ແລະ ຖືວ່າເປັນທຶນ',h:true},{code:'16.1',label:'ທຶນຈົດທະບຽນ'},{code:'16.8',label:'ກຳໄລ-ຂາດທຶນສະສົມ'},{code:'16.10',label:'ຜົນໄດ້ຮັບໃນປີ'},{code:'II',label:'ໜີ້ສິນ ແລະ ທຶນທັງໝົດ',h:true}];
const F03_ROWS = [{code:'1',label:'ລາຍຮັບດອກເບ້ຍ',h:true},{code:'1.2',label:'ລາຍຮັບຈາກລູກຄ້າ'},{code:'2',label:'ລາຍຈ່າຍດອກເບ້ຍ',h:true},{code:'2.2',label:'ລາຍຈ່າຍໃນການເຄື່ອນໄຫວກັບລູກຄ້າ'},{code:'I',label:'ລາຍຮັບຈາກດອກເບ້ຍສຸດທິ',h:true},{code:'9',label:'ຄ່າທຳນຽມ ແລະ ລາຍຮັບອື່ນ',h:true},{code:'III',label:'ລາຍຮັບທັງໝົດສຸດທິ',h:true},{code:'13',label:'ຄ່າໃຊ້ຈ່າຍໃນການບໍລິຫານ',h:true},{code:'15',label:'ທຶນສຳຮອງ ແລະ ເງິນແຮ',h:true},{code:'V',label:'ຜົນກຳໄລ ກ່ອນອາກອນ',h:true},{code:'VI',label:'ຜົນກຳໄລ ສຸດທິ',h:true}];

class FinancialReportsService {
    static async trialBalance(asOfDate) {
        asOfDate = asOfDate || new Date().toISOString().split('T')[0];
        const b = await getBalances(asOfDate); const items = Object.values(b).sort((a,b) => a.account_code.localeCompare(b.account_code));
        const rows = items.map(i => ({ id: i.account_id, code: i.account_code, item_name: i.account_name, debit_bf: 0, credit_bf: 0, debit_movement: i.debit, credit_movement: i.credit, debit_closing: (i.category==='ASSET'||i.category==='EXPENSE') ? Math.max(i.balance,0) : 0, credit_closing: (i.category==='LIABILITY'||i.category==='EQUITY'||i.category==='REVENUE') ? Math.max(i.balance,0) : 0, is_header: false }));
        rows.push({ id: 'total', code: 'ລວມ', item_name: 'ລວມ', debit_bf: 0, credit_bf: 0, debit_movement: rows.reduce((s,r) => s+r.debit_movement, 0), credit_movement: rows.reduce((s,r) => s+r.credit_movement, 0), debit_closing: rows.reduce((s,r) => s+r.debit_closing, 0), credit_closing: rows.reduce((s,r) => s+r.credit_closing, 0), is_header: true });
        return { success: true, data: rows, total: rows.length };
    }
    static async balanceSheet(asOfDate) { return { success: true, data: F02_ROWS.map(r => ({ id: r.code, code: r.code, item_name: `${r.code} ${r.label}`, total_amount: 0, is_header: !!r.h })), total: F02_ROWS.length }; }
    static async incomeStatement() { return { success: true, data: F03_ROWS.map(r => ({ id: r.code, code: r.code, item_name: `${r.code} ${r.label}`, total_amount: 0, is_header: !!r.h })), total: F03_ROWS.length }; }
}

module.exports = FinancialReportsService;
