/**
 * journal_entry.routes.js
 * 
 * API ສຳລັບ ບັນທຶກປະຈຳວັນ (Journal Entry)
 * 
 * Endpoints:
 *   GET    /api/journal-entries          — ລາຍການ (ກັ່ນຕອງ ຕາມ ວັນທີ, ສະຖານະ, ອ້າງອີງ)
 *   GET    /api/journal-entries/:id      — detail ພ້ອມ lines
 *   POST   /api/journal-entries          — ສ້າງໃໝ່ (DRAFT)
 *   PUT    /api/journal-entries/:id      — ແກ້ DRAFT
 *   PATCH  /api/journal-entries/:id/post — ປ່ຽນ → POSTED
 *   DELETE /api/journal-entries/:id      — ລຶບ (soft delete, DRAFT ເທົ່ານັ້ນ)
 */
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');
const { requirePermission } = require('../middleware/rbac');

const JournalEntry = db['journal_entries'];
const JournalEntryLine = db['journal_entry_lines'];
const ChartOfAccounts = db['chart_of_accounts'];

// ═══════════════════════════════════════════════════════
// GET /journal-entries — ລາຍການ ທັງໝົດ (ກັ່ນຕອງ, pagination)
// ═══════════════════════════════════════════════════════
router.get('/journal-entries', async (req, res) => {
    try {
        const {
            date_from, date_to,
            status,
            reference_no,
            page = 1,
            limit = 20,
        } = req.query;

        const where = {};

        // ── ກັ່ນຕອງ ──
        if (date_from && date_to) {
            where.transaction_date = { [Op.between]: [date_from, date_to] };
        } else if (date_from) {
            where.transaction_date = { [Op.gte]: date_from };
        } else if (date_to) {
            where.transaction_date = { [Op.lte]: date_to };
        }

        if (status) where.status = status;
        if (reference_no) {
            where.reference_no = { [Op.iLike]: `%${reference_no}%` };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows, count } = await JournalEntry.findAndCountAll({
            where,
            order: [['transaction_date', 'DESC'], ['id', 'DESC']],
            limit: parseInt(limit),
            offset,
            raw: true,
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('GET /journal-entries error:', error);
        res.status(500).json({ success: false, message: 'ເກີດຂໍ້ຜິດພາດ', error: error.message });
    }
});

// ═══════════════════════════════════════════════════════
// GET /journal-entries/:id — ລາຍລະອຽດ ພ້ອມ lines
// ═══════════════════════════════════════════════════════
router.get('/journal-entries/:id', async (req, res) => {
    try {
        const entry = await JournalEntry.findByPk(req.params.id, { raw: true });
        if (!entry) {
            return res.status(404).json({ success: false, message: 'ບໍ່ພົບລາຍການ' });
        }

        // ── ດຶງ lines ──
        const lines = await JournalEntryLine.findAll({
            where: { journal_entry_id: entry.id },
            order: [['id', 'ASC']],
            raw: true,
        });

        // ── ດຶງ account info ສຳລັບ ແຕ່ລະ line ──
        const accountIds = [...new Set(lines.map(l => l.account_id))];
        let accountMap = {};
        if (accountIds.length > 0 && ChartOfAccounts) {
            const accounts = await ChartOfAccounts.findAll({
                where: { id: accountIds },
                raw: true,
            });
            accounts.forEach(a => {
                accountMap[a.id] = {
                    account_code: a.account_code,
                    account_name: a.account_name_la || a.account_code,
                };
            });
        }

        // ── ເພີ່ມ account info ໃສ່ lines ──
        const enrichedLines = lines.map(l => ({
            ...l,
            account_code: accountMap[l.account_id]?.account_code || '',
            account_name: accountMap[l.account_id]?.account_name || '',
        }));

        res.json({
            success: true,
            data: {
                ...entry,
                lines: enrichedLines,
            },
        });
    } catch (error) {
        console.error('GET /journal-entries/:id error:', error);
        res.status(500).json({ success: false, message: 'ເກີດຂໍ້ຜິດພາດ', error: error.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /journal-entries — ສ້າງ Journal Entry ໃໝ່
// ═══════════════════════════════════════════════════════
router.post('/journal-entries', requirePermission('ແກ້ໄຂບັນຊີ'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const {
            transaction_date,
            reference_no,
            description,
            currency_code = 'LAK',
            exchange_rate = 1,
            branch_id,
            lines = [],
        } = req.body;

        // ── ກວດສອບ ──
        if (!transaction_date) {
            return res.status(400).json({ success: false, message: 'ກະລຸນາລະບຸ ວັນທີ' });
        }
        if (!lines || lines.length < 2) {
            return res.status(400).json({ success: false, message: 'ຕ້ອງມີ ≥ 2 ບັນທັດ' });
        }

        // ── ຄຳນວນ ລວມ debit/credit ──
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of lines) {
            totalDebit += parseFloat(line.debit || 0);
            totalCredit += parseFloat(line.credit || 0);
        }

        // ── ກວດ ວ່າ ດຸນ (Balance) ──
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `ເດບິດ (${totalDebit.toLocaleString()}) ≠ ເຄຣດິດ (${totalCredit.toLocaleString()})`,
            });
        }

        // ── ສ້າງ LifExheader ──
        const entry = await JournalEntry.create({
            transaction_date,
            reference_no: reference_no || `JE-${Date.now()}`,
            description: description || '',
            currency_code,
            exchange_rate,
            status: 'DRAFT',
            total_debit: totalDebit,
            total_credit: totalCredit,
            branch_id: branch_id || null,
            created_by: null, // TODO: ເພີ່ມ user authentication
        }, { transaction: t });

        // ── ສ້າງ lines ──
        const lineRecords = lines.map(l => ({
            journal_entry_id: entry.id,
            account_id: parseInt(l.account_id),
            description: l.description || '',
            debit: parseFloat(l.debit || 0),
            credit: parseFloat(l.credit || 0),
        }));

        await JournalEntryLine.bulkCreate(lineRecords, { transaction: t });

        await t.commit();

        res.status(201).json({
            success: true,
            message: 'ບັນທຶກສຳເລັດ',
            data: { id: entry.id, reference_no: entry.reference_no },
        });
    } catch (error) {
        await t.rollback();
        console.error('POST /journal-entries error:', error);
        res.status(500).json({ success: false, message: 'ເກີດຂໍ້ຜິດພາດ', error: error.message });
    }
});

// ═══════════════════════════════════════════════════════
// PUT /journal-entries/:id — ແກ້ Entry (DRAFT ເທົ່ານັ້ນ)
// ═══════════════════════════════════════════════════════
router.put('/journal-entries/:id', requirePermission('ແກ້ໄຂບັນຊີ'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const entry = await JournalEntry.findByPk(req.params.id);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'ບໍ່ພົບລາຍການ' });
        }
        if (entry.status !== 'DRAFT') {
            return res.status(400).json({ success: false, message: 'ແກ້ໄດ້ ເມື່ອ ສະຖານະ DRAFT ເທົ່ານັ້ນ' });
        }

        const {
            transaction_date,
            reference_no,
            description,
            currency_code,
            exchange_rate,
            branch_id,
            lines = [],
        } = req.body;

        // ── ຄຳນວນ ──
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of lines) {
            totalDebit += parseFloat(line.debit || 0);
            totalCredit += parseFloat(line.credit || 0);
        }

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `ເດບິດ (${totalDebit.toLocaleString()}) ≠ ເຄຣດິດ (${totalCredit.toLocaleString()})`,
            });
        }

        // ── Update header ──
        await entry.update({
            transaction_date: transaction_date || entry.transaction_date,
            reference_no: reference_no || entry.reference_no,
            description: description !== undefined ? description : entry.description,
            currency_code: currency_code || entry.currency_code,
            exchange_rate: exchange_rate || entry.exchange_rate,
            branch_id: branch_id !== undefined ? branch_id : entry.branch_id,
            total_debit: totalDebit,
            total_credit: totalCredit,
        }, { transaction: t });

        // ── ລຶບ lines ເກົ່າ, ສ້າງ lines ໃໝ່ ──
        await JournalEntryLine.destroy({
            where: { journal_entry_id: entry.id },
            transaction: t,
        });

        const lineRecords = lines.map(l => ({
            journal_entry_id: entry.id,
            account_id: parseInt(l.account_id),
            description: l.description || '',
            debit: parseFloat(l.debit || 0),
            credit: parseFloat(l.credit || 0),
        }));
        await JournalEntryLine.bulkCreate(lineRecords, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            message: 'ແກ້ໄຂສຳເລັດ',
            data: { id: entry.id },
        });
    } catch (error) {
        await t.rollback();
        console.error('PUT /journal-entries/:id error:', error);
        res.status(500).json({ success: false, message: 'ເກີດຂໍ້ຜິດພາດ', error: error.message });
    }
});

// ═══════════════════════════════════════════════════════
// PATCH /journal-entries/:id/post — ປ່ຽນ DRAFT → POSTED
// ═══════════════════════════════════════════════════════
router.patch('/journal-entries/:id/post', async (req, res) => {
    try {
        const entry = await JournalEntry.findByPk(req.params.id);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'ບໍ່ພົບລາຍການ' });
        }
        if (entry.status !== 'DRAFT') {
            return res.status(400).json({ success: false, message: 'ລາຍການ ບໍ່ແມ່ນ DRAFT' });
        }

        await entry.update({
            status: 'POSTED',
            posted_by: null, // TODO: ໃສ່ user_id
            posted_at: new Date(),
        });

        res.json({ success: true, message: 'ປ່ຽນສະຖານະ ເປັນ POSTED ສຳເລັດ' });
    } catch (error) {
        console.error('PATCH /journal-entries/:id/post error:', error);
        res.status(500).json({ success: false, message: 'ເກີດຂໍ້ຜິດພາດ', error: error.message });
    }
});

// ═══════════════════════════════════════════════════════
// DELETE /journal-entries/:id — ລຶບ (DRAFT ເທົ່ານັ້ນ)
// ═══════════════════════════════════════════════════════
router.delete('/journal-entries/:id', requirePermission('ແກ້ໄຂບັນຊີ'), async (req, res) => {
    try {
        const entry = await JournalEntry.findByPk(req.params.id);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'ບໍ່ພົບລາຍການ' });
        }
        if (entry.status !== 'DRAFT') {
            return res.status(400).json({ success: false, message: 'ລຶບໄດ້ ເມື່ອ ສະຖານະ DRAFT ເທົ່ານັ້ນ' });
        }

        // ── ລຶບ lines + header ──
        await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id } });
        await entry.destroy(); // soft delete (paranoid)

        res.json({ success: true, message: 'ລຶບສຳເລັດ' });
    } catch (error) {
        console.error('DELETE /journal-entries/:id error:', error);
        res.status(500).json({ success: false, message: 'ເກີດຂໍ້ຜິດພາດ', error: error.message });
    }
});

module.exports = router;
