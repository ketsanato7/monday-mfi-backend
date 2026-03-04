/**
 * general_ledger.routes.js
 * API endpoints ສຳລັບ ປຶ້ມບັນຊີໃຫຍ່ (General Ledger)
 * ສະແດງລາຍການເຄື່ອນໄຫວ per account ພ້ອມ running balance
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');

const JournalEntry = db['journal_entries'];
const JournalEntryLine = db['journal_entry_lines'];
const ChartOfAccounts = db['chart_of_accounts'];

// ============================================================
// GET /general-ledger
// ປຶ້ມບັນຊີໃຫຍ່ — ລາຍການເຄື່ອນໄຫວ ຂອງ 1 ບັນຊີ
//
// Query params:
//   account_code — ລະຫັດບັນຊີ (ບັງຄັບ)
//   from         — ວັນທີເລີ່ມ (YYYY-MM-DD)
//   to           — ວັນທີສິ້ນສຸດ (YYYY-MM-DD)
//   page         — ໜ້າ (default 1)
//   limit        — ຈຳນວນ per page (default 100)
// ============================================================
router.get('/general-ledger', async (req, res) => {
    try {
        const {
            account_code,
            from,
            to,
            page = 1,
            limit = 100,
        } = req.query;

        if (!account_code) {
            return res.status(400).json({
                success: false,
                message: 'ກະລຸນາລະບຸ ລະຫັດບັນຊີ (account_code)',
            });
        }

        // 1. ກວດວ່າ ບັນຊີນີ້ ມີຢູ່ ຫຼື ບໍ່
        let accountInfo = null;
        let accountId = null;
        if (ChartOfAccounts) {
            const rawAccount = await ChartOfAccounts.findOne({
                where: { account_code },
                raw: true,
            });
            if (rawAccount) {
                accountId = rawAccount.id;
                accountInfo = {
                    id: rawAccount.id,
                    account_code: rawAccount.account_code,
                    account_name: rawAccount.account_name_la || rawAccount.account_code,
                    account_type: rawAccount.account_type || rawAccount.coa_type || '',
                };
            }
        }

        // 2. ຄຳນວນ ຍອດຍົກມາ (Opening Balance)
        // = ລວມ debit - credit ຂອງທຸກ lines ກ່ອນ from date
        let openingBalance = 0;
        if (from && accountId) {
            // Find journal entries before 'from' date
            const openingEntries = await JournalEntry.findAll({
                where: {
                    transaction_date: { [Op.lt]: from },
                    status: 'POSTED',
                },
                attributes: ['id'],
                raw: true,
            });
            const entryIds = openingEntries.map(e => e.id);

            if (entryIds.length > 0) {
                const openingLines = await JournalEntryLine.findAll({
                    where: {
                        journal_entry_id: { [Op.in]: entryIds },
                        account_id: accountId,
                    },
                    raw: true,
                });
                openingLines.forEach(line => {
                    openingBalance += parseFloat(line.debit || 0) - parseFloat(line.credit || 0);
                });
            }
        }

        // 3. ດຶງ journal entries ໃນຊ່ວງ from-to
        const entryWhere = { status: 'POSTED' };
        if (from || to) {
            entryWhere.transaction_date = {};
            if (from) entryWhere.transaction_date[Op.gte] = from;
            if (to) entryWhere.transaction_date[Op.lte] = to;
        }

        const entries = await JournalEntry.findAll({
            where: entryWhere,
            order: [['transaction_date', 'ASC'], ['id', 'ASC']],
            raw: true,
        });
        const entryIds = entries.map(e => e.id);
        const entryMap = {};
        entries.forEach(e => { entryMap[e.id] = e; });

        // 4. ດຶງ lines ທີ່ match account_code
        let lines = [];
        if (entryIds.length > 0 && accountId) {
            lines = await JournalEntryLine.findAll({
                where: {
                    journal_entry_id: { [Op.in]: entryIds },
                    account_id: accountId,
                },
                order: [['id', 'ASC']],
                raw: true,
            });
        }

        // 5. ຄຳນວນ running balance + map entry info
        let runningBalance = openingBalance;
        const ledgerData = lines.map(line => {
            const entry = entryMap[line.journal_entry_id] || {};
            const debit = parseFloat(line.debit || 0);
            const credit = parseFloat(line.credit || 0);
            runningBalance += debit - credit;

            return {
                id: line.id,
                transaction_date: entry.transaction_date,
                reference_no: entry.reference_no || '',
                description: line.description || entry.description || '',
                debit,
                credit,
                running_balance: runningBalance,
                journal_entry_id: line.journal_entry_id,
                status: entry.status,
            };
        });

        // 6. Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const totalRecords = ledgerData.length;
        const totalPages = Math.ceil(totalRecords / limitNum);
        const offset = (pageNum - 1) * limitNum;
        const paginatedData = ledgerData.slice(offset, offset + limitNum);

        // 7. Summary
        const totalDebit = ledgerData.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = ledgerData.reduce((sum, l) => sum + l.credit, 0);
        const closingBalance = openingBalance + totalDebit - totalCredit;

        res.json({
            success: true,
            account: accountInfo || { account_code, account_name: account_code },
            summary: {
                opening_balance: openingBalance,
                total_debit: totalDebit,
                total_credit: totalCredit,
                net_movement: totalDebit - totalCredit,
                closing_balance: closingBalance,
                entries_count: totalRecords,
            },
            data: paginatedData,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total_records: totalRecords,
                total_pages: totalPages,
            },
        });

    } catch (error) {
        console.error('❌ General Ledger error:', error);
        res.status(500).json({
            success: false,
            message: 'ເກີດຂໍ້ຜິດພາດ',
            error: error.message,
        });
    }
});

// ============================================================
// GET /general-ledger/accounts
// ລາຍການ ບັນຊີທັງໝົດ ສຳລັບ dropdown
// ============================================================
router.get('/general-ledger/accounts', async (req, res) => {
    try {
        if (!ChartOfAccounts) {
            return res.json({ success: true, data: [] });
        }

        const accounts = await ChartOfAccounts.findAll({
            order: [['account_code', 'ASC']],
            raw: true,
        });

        res.json({
            success: true,
            data: accounts.map(a => ({
                id: a.id,
                account_code: a.account_code,
                account_name: a.account_name_la || a.account_code,
                account_type: a.account_type || a.coa_type || '',
                level: a.level || 0,
            })),
        });

    } catch (error) {
        console.error('❌ GL accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'ເກີດຂໍ້ຜິດພາດ',
            error: error.message,
        });
    }
});

module.exports = router;
