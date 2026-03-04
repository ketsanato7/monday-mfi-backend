/**
 * financial_reports.routes.js
 * BOL Standard: F01 (ໃບດຸ່ນດ່ຽງ), F02 (ຖານະການເງິນ), F03 (ຜົນການດຳເນີນ)
 */
const express = require('express');
const router = express.Router();
const { Op, fn, col } = require('sequelize');
const db = require('../models');

const JournalEntry = db['journal_entries'];
const JournalEntryLine = db['journal_entry_lines'];
const ChartOfAccounts = db['chart_of_accounts'];

// ═══ Helper: account category ═══
function getAccountCategory(code) {
    if (!code) return 'OTHER';
    const p = code.charAt(0);
    return p === '1' ? 'ASSET' : p === '2' ? 'LIABILITY' : p === '3' ? 'EQUITY' : p === '4' ? 'REVENUE' : p === '5' ? 'EXPENSE' : 'OTHER';
}
function getCategoryLabel(cat) {
    return { ASSET: 'ຊັບສິນ', LIABILITY: 'ໜີ້ສິນ', EQUITY: 'ທຶນ', REVENUE: 'ລາຍຮັບ', EXPENSE: 'ຄ່າໃຊ້ຈ່າຍ' }[cat] || 'ອື່ນໆ';
}

// ═══ Helper: ຄຳນວນ ຍອດ ═══
async function getAccountBalances(asOfDate) {
    const entryWhere = { status: 'POSTED' };
    if (asOfDate) entryWhere.transaction_date = { [Op.lte]: asOfDate };
    const entries = await JournalEntry.findAll({ where: entryWhere, attributes: ['id'], raw: true });
    const entryIds = entries.map(e => e.id);
    if (entryIds.length === 0) return {};
    const lineGroups = await JournalEntryLine.findAll({
        where: { journal_entry_id: { [Op.in]: entryIds } },
        attributes: ['account_id', [fn('SUM', col('debit')), 'total_debit'], [fn('SUM', col('credit')), 'total_credit']],
        group: ['account_id'], raw: true,
    });
    const accountIds = lineGroups.map(l => l.account_id);
    const accounts = await ChartOfAccounts.findAll({ where: { id: accountIds }, raw: true });
    const accountMap = {};
    accounts.forEach(a => { accountMap[a.id] = a; });
    const balances = {};
    lineGroups.forEach(lg => {
        const account = accountMap[lg.account_id];
        if (!account) return;
        const code = account.account_code;
        const category = getAccountCategory(code);
        const debit = parseFloat(lg.total_debit || 0);
        const credit = parseFloat(lg.total_credit || 0);
        const balance = (category === 'ASSET' || category === 'EXPENSE') ? debit - credit : credit - debit;
        balances[lg.account_id] = {
            account_id: lg.account_id, account_code: code,
            account_name: account.account_name_la || code,
            category, category_label: getCategoryLabel(category),
            debit, credit, balance,
        };
    });
    return balances;
}

// ═══════════════
// F01: ໃບດຸ່ນດ່ຽງ (Trial Balance)
// ═══════════════
router.get('/reports/trial-balance', async (req, res) => {
    try {
        const asOfDate = req.query.as_of_date || new Date().toISOString().split('T')[0];
        const balances = await getAccountBalances(asOfDate);
        const items = Object.values(balances).sort((a, b) => a.account_code.localeCompare(b.account_code));
        // Convert to BOL flat rows
        const rows = items.map((item, i) => ({
            id: item.account_id,
            code: item.account_code,
            item_name: item.account_name,
            debit_bf: 0, credit_bf: 0,
            debit_movement: item.debit,
            credit_movement: item.credit,
            debit_closing: item.category === 'ASSET' || item.category === 'EXPENSE' ? Math.max(item.balance, 0) : 0,
            credit_closing: item.category === 'LIABILITY' || item.category === 'EQUITY' || item.category === 'REVENUE' ? Math.max(item.balance, 0) : 0,
            is_header: false,
        }));
        // Add total row
        rows.push({
            id: 'total', code: 'ລວມ', item_name: 'ລວມ',
            debit_bf: 0, credit_bf: 0,
            debit_movement: rows.reduce((s, r) => s + r.debit_movement, 0),
            credit_movement: rows.reduce((s, r) => s + r.credit_movement, 0),
            debit_closing: rows.reduce((s, r) => s + r.debit_closing, 0),
            credit_closing: rows.reduce((s, r) => s + r.credit_closing, 0),
            is_header: true,
        });
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════
// F02: ຖານະການເງິນ (Balance Sheet) — BOL 79 fixed rows
// ═══════════════
const F02_ROWS = [
    { code: '1', label: 'ເງິນສົດ ແລະ ເງິນຝາກຢູ່ທະນາຄານແຫ່ງ ສປປ ລາວ', isHeader: true },
    { code: '1.1', label: 'ເງິນສົດ ແລະ ທີ່ຖືວ່າຄືເງິນສົດ', isHeader: false },
    { code: '1.2', label: 'ເງິນຝາກບໍ່ມີກຳນົດ', isHeader: false },
    { code: '1.3', label: 'ເງິນຝາກມີກຳນົດ', isHeader: false },
    { code: '2', label: 'ໜີ້ຕ້ອງຮັບຈາກສະຖາບັນການເງິນອື່ນ', isHeader: true },
    { code: '2.1', label: 'ເງິນຝາກບໍ່ມີກຳນົດ', isHeader: false },
    { code: '2.2', label: 'ເງິນຝາກມີກຳນົດ', isHeader: false },
    { code: '2.3', label: 'ເງິນໃຫ້ກູ້ຢືມ ແລະ ເງິນລ່ວງໜ້າສຸດທິ', isHeader: false },
    { code: '3', label: 'ຫຼັກຊັບຊື້ໂດຍມີສັນຍາຂາຍຄືນ', isHeader: true },
    { code: '3.1', label: 'ຫຼັກຊັບຊື້ໂດຍມີສັນຍາຂາຍຄືນ', isHeader: false },
    { code: '3.2', label: 'ໜີ້ຕ້ອງຮັບທວງຍາກ ແລະ ລາຍການອື່ນໆ', isHeader: false },
    { code: '4', label: 'ເງິນລົງທຶນໃນຫຼັກຊັບສຸດທິ', isHeader: true },
    { code: '4.1', label: 'ຫຼັກຊັບເພື່ອຄ້າ', isHeader: false },
    { code: '4.2', label: 'ຫຼັກຊັບຊື້ເພື່ອຂາຍ', isHeader: false },
    { code: '4.3', label: 'ຫຼັກຊັບລົງທຶນ', isHeader: false },
    { code: '5', label: 'ສິນເຊື່ອ ແລະ ເງິນລ່ວງໜ້າໃຫ້ລູກຄ້າສຸດທິ', isHeader: true },
    { code: '5.1', label: 'ໜີ້ປົກກະຕິ', isHeader: false },
    { code: '5.2', label: 'ໜີ້ຄວນເອົາໃຈໃສ່', isHeader: false },
    { code: '5.3', label: 'ໜີ້ທວງຍາກຈາກລູກຄ້າ', isHeader: false },
    { code: '5.4', label: 'ເງິນແຮຄ່າເຊື່ອມໜີ້ທວງຍາກ', isHeader: false },
    { code: '6', label: 'ເງິນລົງທຶນໃນວິສາຫະກິດໃນກຸ່ມ', isHeader: true },
    { code: '6.1', label: 'ເງິນລົງທຶນໃນທຸລະກິດໃນກຸ່ມ', isHeader: false },
    { code: '6.2', label: 'ເງິນແຮຄ່າເຊື່ອມຂອງເງິນລົງທຶນ', isHeader: false },
    { code: '6.3', label: 'ເງິນລົງທຶນຮ່ວມຂອງວິສາຫະກິດໃນກຸ່ມ', isHeader: true },
    { code: '6.4', label: 'ເງິນແຮຄ່າເຊື່ອມການລົງທຶນ', isHeader: false },
    { code: '7', label: 'ສິນເຊື່ອເຊົ່າ-ຊື້ ແລະ ໃຫ້ເຊົ່າການເງິນ', isHeader: true },
    { code: '7.1', label: 'ສິນເຊື່ອເຊົ່າຊື້ ແລະ ກິດຈະກໍາປະເພດດຽວກັນ', isHeader: false },
    { code: '7.2', label: 'ຄ່າຫຼຸ້ຍຫ້ຽນສະສົມ', isHeader: true },
    { code: '7.3', label: 'ເງິນແຮຄ່າເຊື່ອມມູນຄ່າ', isHeader: true },
    { code: '7.4', label: 'ຊັບສົມບັດຄົງທີ່ໃຫ້ເຊົ່າທໍາມະດາ', isHeader: false },
    { code: '7.5', label: 'ຄ່າຫຼຸ້ຍຫ້ຽນສະສົມ ຊັບສົມບັດໃຫ້ເຊົ່າທໍາມະດາ', isHeader: false },
    { code: '7.6', label: 'ເງິນແຮຄ່າເຊື່ອມມູນຄ່າ ໃຫ້ເຊົ່າທໍາມະດາ', isHeader: false },
    { code: '7.7', label: 'ໜີ້ຕ້ອງຮັບທວງຍາກ', isHeader: false },
    { code: '7.8', label: 'ເງິນແຮຄ່າເຊື່ອມມູນຄ່າໜີ້ຕ້ອງຮັບທວງຍາກ', isHeader: false },
    { code: '8', label: 'ຊັບສົມບັດຄົງທີ່ສຸດທິ', isHeader: true },
    { code: '8.1', label: 'ຊ.ຄ.ທ ພວມຊື້ ແລະ ພວມກໍ່ສ້າງ', isHeader: false },
    { code: '8.2', label: 'ຊ.ຄ.ທ ບໍ່ມີຕົວຕົນ', isHeader: false },
    { code: '8.3', label: 'ຊ.ຄ.ທ ມີຕົວຕົນ', isHeader: false },
    { code: '9', label: 'ທຶນຈົດທະບຽນບໍ່ທັນໄດ້ຖອກ', isHeader: true },
    { code: '9.1', label: 'ຜູ້ຖືຮຸ້ນ', isHeader: false },
    { code: '10', label: 'ຊັບສິນອື່ນໆ', isHeader: true },
    { code: '10.1', label: 'ດອກເບ້ຍ ແລະ ລາຍຮັບອື່ນໆຄ້າງຮັບ', isHeader: false },
    { code: '10.2', label: 'ບັນຊີລະຫວ່າງສຳນັກງານໃຫຍ່ກັບສາຂາ', isHeader: false },
    { code: '10.3', label: 'ອື່ນໆ', isHeader: false },
    { code: 'I', label: 'ຊັບສິນທັງໝົດ', isHeader: true },
    { code: '11', label: 'ໜີ້ຕ້ອງສົ່ງໃຫ້ທະນາຄານ ແລະ ສະຖາບັນການເງິນອື່ນ', isHeader: true },
    { code: '11.1', label: 'ເງິນຮັບຝາກບໍ່ມີກຳນົດ', isHeader: false },
    { code: '11.2', label: 'ເງິນຮັບຝາກມີກຳນົດ', isHeader: false },
    { code: '11.3', label: 'ເງິນກູ້ຢືມ', isHeader: false },
    { code: '11.4', label: 'ໜີ້ຕ້ອງສົ່ງອື່ນໆໃຫ້ທະນາຄານ ແລະ ສະຖາບັນການເງິນອື່ນ', isHeader: false },
    { code: '12', label: 'ໜີ້ຕ້ອງສົ່ງໃຫ້ລູກຄ້າ', isHeader: true },
    { code: '12.1', label: 'ເງິນຮັບຝາກບໍ່ມີກຳນົດ', isHeader: false },
    { code: '12.2', label: 'ເງິນຮັບຝາກມີກຳນົດ', isHeader: false },
    { code: '12.3', label: 'ໜີ້ຕ້ອງສົ່ງອື່ນໆໃຫ້ລູກຄ້າ', isHeader: false },
    { code: '13', label: 'ຫຼັກຊັບຂາຍໂດຍມີສັນຍາຊື້ຄືນ', isHeader: true },
    { code: '13.1', label: 'ຫຼັກຊັບຂາຍໂດຍມີສັນຍາຊື້ຄືນ', isHeader: false },
    { code: '14', label: 'ໜີ້ຕ້ອງສົ່ງທີ່ກຳເນີດຈາກການຈຳໜ່າຍຫຼັກຊັບ', isHeader: true },
    { code: '14.1', label: 'ເອກະສານຢັ້ງຢືນການກູ້ຢືມເງິນ', isHeader: false },
    { code: '14.2', label: 'ພັນທະບັດ ຫຼື ເງິນກູ້ທີ່ໄດ້ຈໍາໜ່າຍອອກ', isHeader: false },
    { code: '15', label: 'ໜີ້ສິນອື່ນໆ', isHeader: true },
    { code: '15.1', label: 'ດອກເບ້ຍ ແລະ ລາຍຈ່າຍອື່ນໆຄ້າງຈ່າຍ', isHeader: false },
    { code: '15.2', label: 'ບັນຊີພົວພັນລະຫວ່າງສຳນັກງານໃຫຍ່ກັບສາຂາ', isHeader: false },
    { code: '15.3', label: 'ອື່ນໆ', isHeader: false },
    { code: '16', label: 'ທຶນ ແລະ ຖືວ່າເປັນທຶນຂອງສະຖາບັນການເງິນ', isHeader: true },
    { code: '16.1', label: 'ທຶນຈົດທະບຽນ', isHeader: false },
    { code: '16.2', label: 'ສ່ວນເພີ່ມມູນຄ່າຮຸ້ນ', isHeader: false },
    { code: '16.3', label: 'ຄັງສຳຮອງຕາມກົດໝາຍ', isHeader: false },
    { code: '16.4', label: 'ຄັງຂະຫຍາຍທຸລະກິດສະຖາບັນການເງິນ', isHeader: false },
    { code: '16.5', label: 'ຄັງສຳຮອງອື່ນໆ', isHeader: false },
    { code: '16.6', label: 'ສ່ວນຜິດດ່ຽງຈາກການຕີມູນຄ່າຄືນໃໝ່', isHeader: false },
    { code: '16.7', label: 'ເງິນແຮຕາມຂໍ້ກຳນົດ', isHeader: false },
    { code: '16.8', label: 'ກຳໄລ-ຂາດທຶນສະສົມ', isHeader: false },
    { code: '16.9', label: 'ຜົນໄດ້ຮັບລໍຖ້າຮັບຮອງ', isHeader: false },
    { code: '16.10', label: 'ຜົນໄດ້ຮັບໃນປີ', isHeader: false },
    { code: '16.11', label: 'ເງິນທຶນຊ່ວຍໜູນ ແລະ ທຶນທີ່ໄດ້ຈັດສັນ', isHeader: false },
    { code: '16.12', label: 'ໜີ້ຕ້ອງສົ່ງສຳຮອງ', isHeader: false },
    { code: '16.13', label: 'ເງິນຮຸ້ນສະມາຊິກຂອງ ສສງ', isHeader: false },
    { code: 'II', label: 'ໜີ້ສິນ ແລະ ທຶນທັງໝົດ', isHeader: true },
];

router.get('/reports/balance-sheet', async (req, res) => {
    try {
        const asOfDate = req.query.as_of_date || new Date().toISOString().split('T')[0];
        const rows = F02_ROWS.map((r, i) => ({
            id: r.code, code: r.code, item_name: `${r.code} ${r.label}`,
            total_amount: 0, is_header: r.isHeader,
        }));
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════
// F03: ຜົນການດຳເນີນທຸລະກິດ (Income Statement) — BOL 87 fixed rows
// ═══════════════
const F03_ROWS = [
    { code: '1', label: 'ລາຍຮັບດອກເບ້ຍ ແລະ ທີ່ຖືຄືວ່າດອກເບ້ຍ', isHeader: true },
    { code: '1.1', label: 'ລາຍຮັບຈາກການເຄື່ອນໄຫວລະຫວ່າງທະນາຄານ', isHeader: false },
    { code: '1.2', label: 'ລາຍຮັບຈາກການເຄື່ອນໄຫວຈາກລູກຄ້າ', isHeader: false },
    { code: '1.3', label: 'ລາຍຮັບຈາກຫຼັກຊັບຊື້ໂດຍມີສັນຍາຂາຍຄືນ', isHeader: false },
    { code: '1.4', label: 'ລາຍຮັບຈາກການລົງທຶນໃນຫຼັກຊັບ', isHeader: false },
    { code: '1.5', label: 'ລາຍຮັບດອກເບ້ຍ ແລະ ທີ່ຖືວ່າຄືດອກເບ້ຍອື່ນໆ', isHeader: false },
    { code: '2', label: 'ລາຍຈ່າຍດອກເບ້ຍ ແລະ ທີ່ຖືວ່າຄືດອກເບ້ຍ', isHeader: true },
    { code: '2.1', label: 'ລາຍຈ່າຍໃນການເຄື່ອນໄຫວລະຫວ່າງທະນາຄານ', isHeader: false },
    { code: '2.2', label: 'ລາຍຈ່າຍໃນການເຄື່ອນໄຫວກັບລູກຄ້າ', isHeader: false },
    { code: '2.3', label: 'ລາຍຈ່າຍໃນການຂາຍຫຼັກຊັບໂດຍມີສັນຍາຊື້ຄືນ', isHeader: false },
    { code: '2.4', label: 'ລາຍຈ່າຍໃນການຈຳໜ່າຍຮຸ້ນກູ້', isHeader: false },
    { code: '2.5', label: 'ດອກເບ້ຍ ແລະ ທີ່ຖືວ່າຄືດອກເບ້ຍອື່ນໆ', isHeader: false },
    { code: 'I', label: 'ລາຍຮັບຈາກດອກເບ້ຍສຸດທິ', isHeader: true },
    { code: '3', label: 'ກຳໄລ ຫຼື ຂາດທຶນສຸດທິກ່ຽວກັບການຊື້ຂາຍຄໍາ', isHeader: true },
    { code: '3.1', label: 'ລາຍຮັບທີ່ພົວພັນກັບວັດຖຸມີຄ່າ', isHeader: false },
    { code: '3.2', label: 'ລາຍຈ່າຍກ່ຽວກັບຄໍາ ແລະ ວັດຖຸມີຄ່າ', isHeader: false },
    { code: '4', label: 'ລາຍຮັບຈາກສິນເຊື່ອເຊົ່າຊື້', isHeader: true },
    { code: '4.1', label: 'ລາຍຮັບຈາກສິນເຊື່ອເຊົ່າຊື້', isHeader: false },
    { code: '4.2', label: 'ກ່ຽວກັບສິນເຊື່ອເຊົ່າຊື້', isHeader: false },
    { code: '5', label: 'ລາຍຈ່າຍກ່ຽວກັບສິນເຊື່ອເຊົ່າຊື້', isHeader: true },
    { code: '5.1', label: 'ລາຍຈ່າຍກ່ຽວກັບສິນເຊື່ອເຊົ່າຊື້', isHeader: false },
    { code: '6', label: 'ລາຍຮັບຈາກການໃຫ້ເຊົ່າທຳມະດາ', isHeader: true },
    { code: '6.1', label: 'ລາຍຮັບຈາກການໃຫ້ເຊົ່າທຳມະດາ', isHeader: false },
    { code: '6.2', label: 'ກ່ຽວກັບການໃຫ້ເຊົ່າທໍາມະດາ', isHeader: false },
    { code: '7', label: 'ລາຍຈ່າຍກ່ຽວກັບການໃຫ້ເຊົ່າທຳມະດາ', isHeader: true },
    { code: '7.1', label: 'ລາຍຈ່າຍກ່ຽວກັບການໃຫ້ເຊົ່າທຳມະດາ', isHeader: false },
    { code: '8', label: 'ລາຍຮັບເງິນປັນຜົນ', isHeader: true },
    { code: '8.1', label: 'ເງິນປັນຜົນ ແລະ ລາຍຮັບປະເພດດຽວກັນ', isHeader: false },
    { code: '8.2', label: 'ເງິນປັນຜົນຈາກເງິນໃຫ້ກູ້ຢຶມສໍາຮອງ', isHeader: false },
    { code: 'II', label: 'ລາຍຮັບຈາກການດຳເນີນທຸລະກິດ', isHeader: true },
    { code: '9', label: 'ຄ່າທຳນຽມ ແລະ ລາຍຮັບອື່ນ', isHeader: true },
    { code: '9.1', label: 'ລາຍຮັບຄ່າທຳນຽມ', isHeader: false },
    { code: '9.2', label: 'ລາຍຈ່າຍຄ່າທຳນຽມ', isHeader: false },
    { code: '10', label: 'ກຳໄລ/ຂາດທຶນຈາກການແລກປ່ຽນເງິນຕາ', isHeader: true },
    { code: '10.1', label: 'ກຳໄລ/ຂາດທຶນຈາກການແລກປ່ຽນ', isHeader: false },
    { code: '11', label: 'ກຳໄລ/ຂາດທຶນຈາກການຊື້ຂາຍຫຼັກຊັບ', isHeader: true },
    { code: '11.1', label: 'ຈາກຫຼັກຊັບເພື່ອຄ້າ', isHeader: false },
    { code: '11.2', label: 'ຈາກຫຼັກຊັບຊື້ເພື່ອຂາຍ', isHeader: false },
    { code: '12', label: 'ລາຍຮັບ/ລາຍຈ່າຍອື່ນໆ', isHeader: true },
    { code: '12.1', label: 'ລາຍຮັບອື່ນໆ', isHeader: false },
    { code: '12.2', label: 'ລາຍຈ່າຍອື່ນໆ', isHeader: false },
    { code: 'III', label: 'ລາຍຮັບທັງໝົດສຸດທິ', isHeader: true },
    { code: '13', label: 'ຄ່າໃຊ້ຈ່າຍໃນການບໍລິຫານ', isHeader: true },
    { code: '13.1', label: 'ຄ່າຈ້າງພະນັກງານ ແລະ ຜົນປະໂຫຍດອື່ນໆ', isHeader: false },
    { code: '13.2', label: 'ຄ່າພາສີ-ອາກອນ', isHeader: false },
    { code: '13.3', label: 'ຄ່າເຊົ່າ', isHeader: false },
    { code: '13.4', label: 'ຄ່າບໍລິການພາຍນອກ', isHeader: false },
    { code: '13.5', label: 'ຄ່າໃຊ້ຈ່າຍໃນການບໍລິຫານອື່ນໆ', isHeader: false },
    { code: '14', label: 'ຄ່າຫຼຸ້ຍຫ້ຽນ ແລະ ຄ່າຕັດຈຳໜ່າຍ', isHeader: true },
    { code: '14.1', label: 'ຄ່າຫຼຸ້ຍຫ້ຽນ ຊັບສົມບັດຄົງທີ່', isHeader: false },
    { code: '14.2', label: 'ຄ່າຕັດຈຳໜ່າຍຊັບສິນບໍ່ມີຕົວຕົນ', isHeader: false },
    { code: 'IV', label: 'ຜົນກຳໄລ ຫຼື ຂາດທຶນ ກ່ອນຫັກທຶນຫນູນ', isHeader: true },
    { code: '15', label: 'ທຶນສຳຮອງ ແລະ ເງິນແຮ', isHeader: true },
    { code: '15.1', label: 'ຫັກ/ເກັບເງິນແຮຄ່າເຊື່ອມໜີ້ທວງຍາກ', isHeader: false },
    { code: '15.2', label: 'ຫັກ/ເກັບເງິນແຮອື່ນໆ', isHeader: false },
    { code: 'V', label: 'ຜົນກຳໄລ ຫຼື ຂາດທຶນ ກ່ອນອາກອນ', isHeader: true },
    { code: '16', label: 'ອາກອນກຳໄລ', isHeader: true },
    { code: '16.1', label: 'ອາກອນກຳໄລ', isHeader: false },
    { code: 'VI', label: 'ຜົນກຳໄລ ຫຼື ຂາດທຶນສຸດທິ', isHeader: true },
];

router.get('/reports/income-statement', async (req, res) => {
    try {
        const rows = F03_ROWS.map((r, i) => ({
            id: r.code, code: r.code, item_name: `${r.code} ${r.label}`,
            total_amount: 0, is_header: r.isHeader,
        }));
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
