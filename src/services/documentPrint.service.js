/**
 * documentPrint.service.js — 6 printable document endpoints
 */
const db = require('../models');
const sequelize = db.sequelize;
const { renderTemplate, formatLAK, formatDate, numberToLaoText } = require('../engines/documentEngine');

async function getMfiInfo() {
    const [rows] = await sequelize.query(`SELECT m.name__l_a, m.license_no, ob.name as branch_name, ob.phone_number, ob.address FROM mfi_info m LEFT JOIN org_branches ob ON ob.org_id = 1 AND ob.code = 'HQ' LIMIT 1`);
    return rows[0] || { name__l_a: 'MFI', license_no: '', branch_name: '', phone_number: '', address: '' };
}

class DocumentPrintService {
    static async loanApplication(loanId) {
        const mfi = await getMfiInfo();
        const [loans] = await sequelize.query(`SELECT lc.*, lp2.name as product_name, lpur.name as purpose_name, pi.firstname__la, pi.lastname__la, pi.firstname__en, pi.lastname__en, pi.dateofbirth, pi.mobile_no, pi.home_address, pi.monthly_income, c.name as career_name, lic.card_no as id_card_no FROM loan_contracts lc LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id LEFT JOIN loan_products lp2 ON lp2.id = lc.product_id LEFT JOIN loan_purpose lpur ON lpur.id = lc.loan_purpose_id LEFT JOIN careers c ON c.id = pi.career_id LEFT JOIN lao_id_cards lic ON lic.person_id = pi.id WHERE lc.id = :loanId`, { replacements: { loanId } });
        if (!loans.length) throw Object.assign(new Error('ບໍ່ພົບສັນຍາ'), { status: 404 });
        const loan = loans[0];
        const [colls] = await sequelize.query(`SELECT c.name, c.value, cc.name as category_name, c.collateral_no FROM loan_collaterals lc2 JOIN collaterals c ON c.id = lc2.collateral_id LEFT JOIN collateral_categories cc ON cc.id = c.category_id WHERE lc2.loan_id = :loanId LIMIT 1`, { replacements: { loanId } });
        const col = colls[0] || {};
        return renderTemplate('loan_application', { mfi_name: mfi.name__l_a, branch_name: mfi.branch_name, branch_phone: mfi.phone_number, doc_number: `LA-${Date.now()}`, date: formatDate(new Date()), borrower_name_la: `${loan.firstname__la || ''} ${loan.lastname__la || ''}`, borrower_name_en: `${loan.firstname__en || ''} ${loan.lastname__en || ''}`, id_card_no: loan.id_card_no || '', date_of_birth: formatDate(loan.dateofbirth), phone: loan.mobile_no || '', address: loan.home_address || '', career: loan.career_name || '', monthly_income: formatLAK(loan.monthly_income), loan_amount: formatLAK(loan.approved_amount), loan_amount_text: numberToLaoText(loan.approved_amount), loan_product: loan.product_name || '', loan_purpose: loan.purpose_name || '', term_months: loan.term_months || '', interest_rate: loan.interest_rate || '', collateral_type: col.category_name || '', collateral_detail: col.name || '', collateral_value: formatLAK(col.value), collateral_doc_no: col.collateral_no || '' });
    }

    static async customerForm(personId) {
        const mfi = await getMfiInfo();
        const [persons] = await sequelize.query(`SELECT pi.*, g.name as gender_name, c.name as career_name, ms.name as marital_name, n.name as nationality_name, p.name as province_name, d.name as district_name, v.name as village_name, lic.card_no, lic.exp_date as card_exp, fb.book_no, pp.passport_no, pp.exp_date as passport_exp FROM personal_info pi LEFT JOIN genders g ON g.id = pi.gender_id LEFT JOIN careers c ON c.id = pi.career_id LEFT JOIN marital_statuses ms ON ms.id = pi.marital_status_id LEFT JOIN nationality n ON n.id = pi.nationality_id LEFT JOIN villages v ON v.id = pi.village_id LEFT JOIN districts d ON d.id = v.district_id LEFT JOIN provinces p ON p.id = d.province_id LEFT JOIN lao_id_cards lic ON lic.person_id = pi.id LEFT JOIN family_books fb ON fb.person_id = pi.id LEFT JOIN passports pp ON pp.person_id = pi.id WHERE pi.id = :personId`, { replacements: { personId } });
        if (!persons.length) throw Object.assign(new Error('ບໍ່ພົບຂໍ້ມູນ'), { status: 404 });
        const p = persons[0];
        return renderTemplate('customer_form', { mfi_name: mfi.name__l_a, customer_type_label: 'ບຸກຄົນ', firstname_la: p.firstname__la || '', lastname_la: p.lastname__la || '', firstname_en: p.firstname__en || '', lastname_en: p.lastname__en || '', dob: formatDate(p.dateofbirth), gender: p.gender_name || '', nationality: p.nationality_name || '', marital_status: p.marital_name || '', career: p.career_name || '', monthly_income: formatLAK(p.monthly_income), monthly_expense: formatLAK(p.monthly_expense), existing_debt: formatLAK(p.existing_debt), id_card_no: p.card_no || '', id_card_exp: formatDate(p.card_exp), family_book_no: p.book_no || '', passport_no: p.passport_no || '', passport_exp: formatDate(p.passport_exp), province: p.province_name || '', district: p.district_name || '', village: p.village_name || '', phone: p.mobile_no || '', spouse_name: p.spouse_firstname ? `${p.spouse_firstname} ${p.spouse_lastname || ''}` : '', spouse_phone: p.spouse_mobile_number || '' });
    }

    static async checklist(loanId) {
        const mfi = await getMfiInfo();
        const [loans] = await sequelize.query(`SELECT lc.contract_no, pi.firstname__la, pi.lastname__la FROM loan_contracts lc LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id WHERE lc.id = :loanId`, { replacements: { loanId } });
        const loan = loans[0] || {};
        return renderTemplate('document_checklist', { mfi_name: mfi.name__l_a, borrower_name: `${loan.firstname__la || ''} ${loan.lastname__la || ''}`, contract_no: loan.contract_no || '', date: formatDate(new Date()) });
    }

    static async loanContract(loanId) {
        const mfi = await getMfiInfo();
        const [loans] = await sequelize.query(`SELECT lc.*, lp2.name as product_name, lpur.name as purpose_name, pi.firstname__la, pi.lastname__la, pi.firstname__en, pi.lastname__en, pi.mobile_no, pi.home_address, lic.card_no as id_card_no FROM loan_contracts lc LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id LEFT JOIN loan_products lp2 ON lp2.id = lc.product_id LEFT JOIN loan_purpose lpur ON lpur.id = lc.loan_purpose_id LEFT JOIN lao_id_cards lic ON lic.person_id = pi.id WHERE lc.id = :loanId`, { replacements: { loanId } });
        if (!loans.length) throw Object.assign(new Error('ບໍ່ພົບ'), { status: 404 });
        const loan = loans[0];
        const [colls] = await sequelize.query(`SELECT c.name, c.value, cc.name as cat_name, c.collateral_no FROM loan_collaterals lc2 JOIN collaterals c ON c.id = lc2.collateral_id LEFT JOIN collateral_categories cc ON cc.id = c.category_id WHERE lc2.loan_id = :loanId`, { replacements: { loanId } });
        const collRows = colls.map((c, i) => `<tr><td>${i + 1}</td><td>${c.cat_name || ''}</td><td>${c.name}</td><td>${c.collateral_no || ''}</td><td>${formatLAK(c.value)}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center">ບໍ່ມີຫຼັກຊັບ</td></tr>';
        const [schedules] = await sequelize.query(`SELECT * FROM loan_repayment_schedules WHERE contract_id = :loanId ORDER BY due_date`, { replacements: { loanId } });
        const schedRows = schedules.map((s, i) => { const tot = (parseFloat(s.principal) || 0) + (parseFloat(s.interest) || 0); return `<tr><td>${i + 1}</td><td>${formatDate(s.due_date)}</td><td>${formatLAK(s.principal)}</td><td>${formatLAK(s.interest)}</td><td>${formatLAK(tot)}</td><td>${formatLAK(s.remaining_balance)}</td></tr>`; }).join('') || '<tr><td colspan="6">ຍັງບໍ່ມີຕາຕະລາງ</td></tr>';
        const firstSched = schedules[0];
        const installment = firstSched ? formatLAK((parseFloat(firstSched.principal) || 0) + (parseFloat(firstSched.interest) || 0)) : '';
        return renderTemplate('loan_contract', { mfi_name: mfi.name__l_a, mfi_address: mfi.address || '', mfi_phone: mfi.phone_number || '', branch_name: mfi.branch_name || '', license_no: mfi.license_no || '', contract_no: loan.contract_no, date: formatDate(new Date()), borrower_name_la: `${loan.firstname__la || ''} ${loan.lastname__la || ''}`, borrower_name_en: `${loan.firstname__en || ''} ${loan.lastname__en || ''}`, id_card_no: loan.id_card_no || '', borrower_address: loan.home_address || '', borrower_phone: loan.mobile_no || '', loan_amount: formatLAK(loan.approved_amount), loan_amount_text: numberToLaoText(loan.approved_amount), loan_product: loan.product_name || '', loan_purpose: loan.purpose_name || '', interest_rate: loan.interest_rate, interest_method: parseFloat(loan.approved_amount) >= 5000000 ? 'ຫຼຸດຕົ້ນ' : 'ຄົງທີ່', term_months: loan.term_months, disbursement_date: formatDate(loan.disbursement_date), maturity_date: formatDate(loan.maturity_date), installment_amount: installment, collateral_rows: collRows, schedule_rows: schedRows });
    }

    static async receipt(loanId, scheduleId) {
        const mfi = await getMfiInfo();
        const [data] = await sequelize.query(`SELECT lrs.*, lc.contract_no, lc.term_months, lc.remaining_balance, pi.firstname__la, pi.lastname__la FROM loan_repayment_schedules lrs JOIN loan_contracts lc ON lc.id = lrs.contract_id LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id WHERE lrs.id = :scheduleId AND lrs.contract_id = :loanId`, { replacements: { loanId, scheduleId } });
        if (!data.length) throw Object.assign(new Error('ບໍ່ພົບ'), { status: 404 });
        const d = data[0]; const p = parseFloat(d.principal) || 0; const int = parseFloat(d.interest) || 0; const pen = parseFloat(d.penalty) || 0; const total = p + int + pen;
        return renderTemplate('receipt', { mfi_name: mfi.name__l_a, receipt_no: `RCP-${Date.now()}`, date: formatDate(new Date()), payer_name: `${d.firstname__la || ''} ${d.lastname__la || ''}`, contract_no: d.contract_no, installment_no: d.installment_number || '—', total_installments: d.term_months || '', principal: formatLAK(p), interest: formatLAK(int), penalty: formatLAK(pen), total_amount: formatLAK(total), total_amount_text: numberToLaoText(total), remaining_balance: formatLAK(d.remaining_balance), payment_method: 'ເງິນສົດ' });
    }

    static async debtNotice(loanId) {
        const mfi = await getMfiInfo();
        const [loans] = await sequelize.query(`SELECT lc.*, pi.firstname__la, pi.lastname__la, lcl.name as class_name FROM loan_contracts lc LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id LEFT JOIN loan_classifications lcl ON lcl.id = lc.classification_id WHERE lc.id = :loanId`, { replacements: { loanId } });
        if (!loans.length) throw Object.assign(new Error('ບໍ່ພົບ'), { status: 404 });
        const loan = loans[0];
        const [overdue] = await sequelize.query(`SELECT * FROM loan_repayment_schedules WHERE contract_id = :loanId AND is_paid = false AND due_date < NOW() ORDER BY due_date`, { replacements: { loanId } });
        let totalOverdue = 0;
        const overdueRows = overdue.map((s, i) => { const p = parseFloat(s.principal) || 0; const int = parseFloat(s.interest) || 0; const pen = parseFloat(s.penalty) || 0; const tot = p + int + pen; totalOverdue += tot; return `<tr><td>${i + 1}</td><td>${formatDate(s.due_date)}</td><td>${formatLAK(p)}</td><td>${formatLAK(int)}</td><td>${formatLAK(pen)}</td><td>${formatLAK(tot)}</td></tr>`; }).join('') || '<tr><td colspan="6">ບໍ່ມີງວດຄ້າງ</td></tr>';
        const dpd = overdue[0] ? Math.floor((Date.now() - new Date(overdue[0].due_date).getTime()) / 86400000) : 0;
        return renderTemplate('debt_notice', { mfi_name: mfi.name__l_a, notice_no: `DN-${Date.now()}`, date: formatDate(new Date()), borrower_name: `${loan.firstname__la || ''} ${loan.lastname__la || ''}`, contract_no: loan.contract_no, loan_amount: formatLAK(loan.approved_amount), classification: loan.class_name || 'A', dpd, overdue_days: dpd, overdue_rows: overdueRows, total_overdue: formatLAK(totalOverdue) });
    }
}

module.exports = DocumentPrintService;
