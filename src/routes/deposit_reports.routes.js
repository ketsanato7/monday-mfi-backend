/**
 * deposit_reports.routes.js
 * BOL Standard: F10 (ເງິນຝາກ), F11 (ດອກເບ້ຍເງິນຝາກ)
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const Deposit = db['deposit_accounts'];

// ═══ BOL Deposit Types ═══
const DEPOSIT_TYPES = [
    {
        code: '1', label: 'ເງິນຝາກບໍ່ມີກໍານົດ', sub: [
            { code: '1', label: 'ເງິນຝາກກະແສລາຍວັນ' },
            { code: '2', label: 'ເງິນຝາກປະຢັດ' },
        ]
    },
    {
        code: '2', label: 'ເງິນຝາກມີກຳນົດ', sub: [
            { code: '1', label: 'ເງິນຝາກມີກໍານົດ ໄລຍະສັ້ນ' },
            { code: '2', label: 'ເງິນຝາກມີກໍານົດ ໄລຍະກາງ' },
            { code: '3', label: 'ເງິນຝາກມີກໍານົດ ໄລຍະຍາວ' },
        ]
    },
];

// ═══ F10 Sections ═══
const F10_SECTIONS = [
    { prefix: '1', title: 'I ລວມທັງໝົດ', col2Header: 'ຈໍານວນບັນຊີທັງໝົດ' },
    { prefix: '2', title: 'II ລວມລູກຄ້າບຸກຄົນ', col2Header: 'ຈໍານວນລູກຄ້າບຸກຄົນ (ຄົນ)' },
    { prefix: '3', title: 'III ລູກຄ້າເພດຍິງ', col2Header: 'ຈໍານວນລູກຄ້າເພດຍິງ (ຄົນ)' },
    { prefix: '4', title: 'IV ບຸກຄົນ > 17 ປີ', col2Header: 'ຈໍານວນບຸກຄົນ > 17 ປີ (ຄົນ)' },
    { prefix: '5', title: 'V ເພດຍິງ > 17 ປີ', col2Header: 'ຈໍານວນເພດຍິງ > 17 ປີ (ຄົນ)' },
    { prefix: '6', title: 'VI ນິຕິບຸກຄົນ', col2Header: 'ຈໍານວນນິຕິບຸກຄົນ (ແຫ່ງ)' },
];

function buildDepositSection(deposits, prefix) {
    const rows = [];
    DEPOSIT_TYPES.forEach(type => {
        const typeCode = `${prefix}.${type.code}`;
        rows.push({
            id: typeCode, code: typeCode, item_name: type.label,
            account_count: 0, total_amount: 0, is_header: true,
        });
        type.sub.forEach(sub => {
            const subCode = `${typeCode}.${sub.code}`;
            rows.push({
                id: subCode, code: subCode, item_name: sub.label,
                account_count: 0, total_amount: 0, is_header: false,
            });
        });
    });
    // For now, put all deposits in first sub-category (savings)
    const totalAccounts = deposits.length;
    const totalAmount = deposits.reduce((s, d) => s + parseFloat(d.opening_balance || 0), 0);
    if (rows.length > 0) {
        rows[0].account_count = totalAccounts;
        rows[0].total_amount = totalAmount;
    }
    return rows;
}

// GET /api/reports/deposits/customer (F10)
router.get('/reports/deposits/customer', async (req, res) => {
    try {
        const deposits = await Deposit.findAll({ raw: true });
        const allRows = [];
        F10_SECTIONS.forEach((section, idx) => {
            const sectionRows = buildDepositSection(idx === 0 ? deposits : [], section.prefix);
            allRows.push(...sectionRows);
            const totalAccounts = sectionRows.reduce((s, r) => s + (r.is_header ? r.account_count : 0), 0);
            const totalAmount = sectionRows.reduce((s, r) => s + (r.is_header ? r.total_amount : 0), 0);
            allRows.push({
                id: `${section.prefix}-total`, code: section.title.split(' ')[0],
                item_name: section.title, account_count: totalAccounts,
                total_amount: totalAmount, is_header: true,
            });
        });
        res.json({ success: true, data: allRows, total: allRows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/reports/deposits/interest-rate (F11)
router.get('/reports/deposits/interest-rate', async (req, res) => {
    try {
        const deposits = await Deposit.findAll({ raw: true });
        const rows = [];
        // 1. ເງິນຝາກບໍ່ມີກຳນົດ
        rows.push({ id: '1', code: '1', item_name: 'ເງິນຝາກບໍ່ມີກໍານົດ', avg_interest_rate: '0.00', is_header: true });
        rows.push({ id: '1.1', code: '1.1', item_name: 'ເງິນຝາກກະແສລາຍວັນ', avg_interest_rate: '0.00', is_header: false });
        rows.push({ id: '1.2', code: '1.2', item_name: 'ເງິນຝາກປະຢັດ', avg_interest_rate: '0.00', is_header: false });
        // 2. ເງິນຝາກມີກຳນົດ
        rows.push({ id: '2', code: '2', item_name: 'ເງິນຝາກມີກຳນົດ', avg_interest_rate: '0.00', is_header: true });
        rows.push({ id: '2.1', code: '2.1', item_name: 'ເງິນຝາກມີກໍານົດ ໄລຍະສັ້ນ', avg_interest_rate: '0.00', is_header: false });
        rows.push({ id: '2.2', code: '2.2', item_name: 'ເງິນຝາກມີກໍານົດ ໄລຍະກາງ', avg_interest_rate: '0.00', is_header: false });
        rows.push({ id: '2.3', code: '2.3', item_name: 'ເງິນຝາກມີກໍານົດ ໄລຍະຍາວ', avg_interest_rate: '0.00', is_header: false });
        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
