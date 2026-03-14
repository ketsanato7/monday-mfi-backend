/**
 * creditReports.service.js — BOL F04–F09 Standard Reports
 */
const db = require('../models');
const { Op } = require('sequelize');
const Loan = db['loan_contracts'];

const BOL_BRANCHES = [
    { code: '1', label: 'ອຸດສາຫະກໍາ' }, { code: '2', label: 'ກໍ່ສ້າງ' }, { code: '3', label: 'ປະກອບວັດຖຸເຕັກນິກ' },
    { code: '4', label: 'ກະສິກໍາ ແລະ ປ່າໄມ້' }, { code: '5', label: 'ການຄ້າ' }, { code: '6', label: 'ຂົນສົ່ງ ແລະ ໄປສະນີ' },
    { code: '7', label: 'ບໍລິການ' }, { code: '8', label: 'ຫັດຖະກໍາ' }, { code: '9', label: 'ປະເພດອື່ນໆ' },
];
const BOL_CLASSES = [
    { id: 1, code: 'A', label: 'ສິນເຊື່ອປົກກະຕິ (ຊັ້ນ A)' }, { id: 2, code: 'B', label: 'ສິນເຊື່ອຄວນເອົາໃຈໃສ່ (ຊັ້ນ B)' },
    { id: 3, code: 'C', label: 'ສິນເຊື່ອຕໍ່າກວ່າມາດຕະຖານ (ຊັ້ນ C)' }, { id: 4, code: 'D', label: 'ສິນເຊື່ອທີ່ໜ້າສົງໃສ (ຊັ້ນ D)' },
    { id: 5, code: 'E', label: 'ສິນເຊື່ອທີ່ເປັນໜີ້ສູນ (ຊັ້ນ E)' },
];
const F07_CATS = [ { code: '1', label: 'ຂາຮຸ້ນຂອງສະຖາບັນການເງິນ' }, { code: '2', label: 'ຜູ້ອໍານວຍການຂອງສະຖາບັນການເງິນ' }, { code: '3', label: 'ພະນັກງານຂອງສະຖາບັນການເງິນ' }, { code: '4', label: 'ຜູ້ກວດສອບພາຍນອກ' }, { code: '5', label: 'ສະມາຊິກຄອບຄົວທີ່ໃກ້ຊິດ' } ];

function bal(l) { return parseFloat(l.remaining_balance || l.approved_amount || 0); }
function buildSection(loans, prefix, title) {
    const cls = BOL_CLASSES.map((c, ci) => { const cl = loans.filter(l => l.classification_id === c.id); return { code: `${prefix}.${ci+1}`, label: c.label, total_contracts: cl.length, total_amount: cl.reduce((s,l) => s+bal(l), 0), branches: BOL_BRANCHES.map((b, bi) => { const bl = cl.filter(l => l.economic_branch_id === bi+1); return { code: `${prefix}.${ci+1}.${bi+1}`, label: b.label, contracts: bl.length, amount: bl.reduce((s,l) => s+bal(l), 0) }; }) }; });
    return { prefix, title, total_contracts: loans.length, total_amount: loans.reduce((s,l) => s+bal(l), 0), classifications: cls };
}
function flatten(sec) {
    const r = []; const numLbl = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };
    r.push({ id: `${sec.prefix}-total`, code: numLbl[sec.prefix] || sec.prefix, item_name: sec.title, contract_count: sec.total_contracts, total_amount: sec.total_amount, is_header: true });
    sec.classifications.forEach(c => { r.push({ id: c.code, code: c.code, item_name: c.label, contract_count: c.total_contracts, total_amount: c.total_amount, is_header: true }); c.branches.forEach(b => { r.push({ id: b.code, code: b.code, item_name: b.label, contract_count: b.contracts, total_amount: b.amount, is_header: false }); }); });
    return r;
}

class CreditReportsService {
    static async regular() { const loans = await Loan.findAll({ where: { loan_status: 'ACTIVE' }, raw: true }); const s = buildSection(loans, '1', 'ລວມທັງໝົດ'); return { success: true, data: flatten(s), sections: [s], total: loans.length }; }
    static async restructuring() { const loans = await Loan.findAll({ where: { loan_status: 'ACTIVE', restructured_date: { [Op.not]: null } }, raw: true }); const s = buildSection(loans, '1', 'ລວມທັງໝົດ'); return { success: true, data: flatten(s), sections: [s], total: loans.length }; }
    static async transferred() { const loans = await Loan.findAll({ where: { loan_status: 'TRANSFERRED' }, raw: true }); const s = buildSection(loans, '1', 'ລວມທັງໝົດ'); return { success: true, data: flatten(s), sections: [s], total: loans.length }; }
    static async relatedParty() {
        const loans = await Loan.findAll({ where: { loan_status: 'ACTIVE', borrower_connection_id: { [Op.not]: null } }, raw: true });
        const allRows = [];
        [{ prefix: '1', title: 'I ລວມທັງໝົດ' },{ prefix: '2', title: 'II ລູກຄ້າເພດຊາຍ' },{ prefix: '3', title: 'III ລູກຄ້າເພດຍິງ' },{ prefix: '4', title: 'IV ນິຕິບຸກຄົນ' }].forEach((sec, i) => {
            const sLoans = i === 0 ? loans : [];
            const total = sLoans.reduce((s,l) => s+bal(l), 0);
            allRows.push({ id: `${sec.prefix}.1`, code: `${sec.prefix}.1`, item_name: 'ລວມສິນເຊື່ອໃຫ້ແກ່ພາກສ່ວນທີ່ພົວພັນ', contract_count: sLoans.length, total_amount: total, is_header: true });
            F07_CATS.forEach(cat => { const cl = sLoans.filter(l => String(l.borrower_connection_id) === cat.code); allRows.push({ id: `${sec.prefix}.1.${cat.code}`, code: `${sec.prefix}.1.${cat.code}`, item_name: cat.label, contract_count: cl.length, total_amount: cl.reduce((s,l) => s+bal(l), 0), is_header: false }); });
        });
        return { success: true, data: allRows, total: allRows.length };
    }
    static async largeCustomer() { const loans = await Loan.findAll({ where: { loan_status: 'ACTIVE', approved_amount: { [Op.gte]: 50000000 } }, raw: true }); return { success: true, data: loans.map((l, i) => ({ id: l.id, code: `${i+1}`, item_name: l.contract_no, contract_count: 1, total_amount: bal(l) })), total: loans.length }; }
    static async interestRate() {
        const loans = await Loan.findAll({ where: { loan_status: 'ACTIVE' }, raw: true });
        const avg = a => a.length ? a.reduce((s,l) => s+parseFloat(l.interest_rate||0), 0)/a.length : 0;
        const rows = BOL_BRANCHES.map((b, i) => { const bl = loans.filter(l => l.economic_branch_id === i+1); const s = bl.filter(l => l.term_months<=12), m = bl.filter(l => l.term_months>12&&l.term_months<=60), lo = bl.filter(l => l.term_months>60); return [{ id:`${i+1}`, code:`${i+1}`, item_name:b.label, avg_interest_rate:avg(bl).toFixed(2), is_header:true }, { id:`${i+1}.1`, code:`${i+1}.1`, item_name:`${b.label} ໄລຍະສັ້ນ`, avg_interest_rate:avg(s).toFixed(2), is_header:false }, { id:`${i+1}.2`, code:`${i+1}.2`, item_name:`${b.label} ໄລຍະກາງ`, avg_interest_rate:avg(m).toFixed(2), is_header:false }, { id:`${i+1}.3`, code:`${i+1}.3`, item_name:`${b.label} ໄລຍະຍາວ`, avg_interest_rate:avg(lo).toFixed(2), is_header:false }]; }).flat();
        return { success: true, data: rows, total: rows.length };
    }
}

module.exports = CreditReportsService;
