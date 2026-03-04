/**
 * member_share_reports.routes.js
 * BOL Standard: F12 (ຮຸ້ນສະມາຊິກ)
 * 2 sections: ລວມ / ເພດຍິງ
 * ແຕ່ລະ section: ຮຸ້ນສາມັນ + ບູລິມະສິດ
 */
const express = require('express');
const router = express.Router();
const db = require('../models');

// GET /api/reports/member-shares (F12 — BOL Standard)
router.get('/reports/member-shares', async (req, res) => {
    try {
        let shares = [];
        if (db['member_shares']) {
            shares = await db['member_shares'].findAll({ raw: true });
        }

        const totalMembers = shares.length;
        const totalAmount = shares.reduce((s, sh) => s + parseFloat(sh.initial_contribution || 0), 0);

        const rows = [];

        // Section 1: ລວມທັງໝົດ
        rows.push({ id: '1.1', code: '1.1', item_name: 'ຮຸ້ນສາມັນ', member_count: totalMembers, total_amount: totalAmount, is_header: true });
        rows.push({ id: '1.1.1', code: '1.1.1', item_name: 'ຮຸ້ນສາມັນ', member_count: totalMembers, total_amount: totalAmount, is_header: false });
        rows.push({ id: '1.2', code: '1.2', item_name: 'ຮຸ້ນບູລິມະສິດ', member_count: 0, total_amount: 0, is_header: true });
        rows.push({ id: '1.2.1', code: '1.2.1', item_name: 'ຮຸ້ນບູລິມະສິດ', member_count: 0, total_amount: 0, is_header: false });

        // Section 2: ເພດຍິງ
        rows.push({ id: '2.1', code: '2.1', item_name: 'ຮຸ້ນສາມັນ', member_count: 0, total_amount: 0, is_header: true });
        rows.push({ id: '2.1.1', code: '2.1.1', item_name: 'ຮຸ້ນສາມັນ', member_count: 0, total_amount: 0, is_header: false });
        rows.push({ id: '2.2', code: '2.2', item_name: 'ຮຸ້ນບູລິມະສິດ', member_count: 0, total_amount: 0, is_header: true });
        rows.push({ id: '2.2.1', code: '2.2.1', item_name: 'ຮຸ້ນບູລິມະສິດ', member_count: 0, total_amount: 0, is_header: false });

        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
