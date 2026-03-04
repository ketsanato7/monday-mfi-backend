/**
 * loan_journal.routes.js
 * API endpoints ສຳລັບ ລາຍການເຄື່ອນໄຫວບັນຊີເງິນກູ້
 * ໃຊ້ຈາກ ໜ້າ ປຶ້ມບັນທຶກລາຍການ (Loan Journal Ledger)
 */

const express = require('express');
const router = express.Router();
const { Sequelize, Op } = require('sequelize');
const db = require('../models');

const JournalEntry = db['journal_entries'];
const JournalEntryLine = db['journal_entry_lines'];
const ChartOfAccounts = db['chart_of_accounts'];
const Loan = db['loans'];
const LoanTransaction = db['loan_transactions'];

/**
 * GET /loan-journal/ledger
 *
 * Query params:
 *   loan_id   — filter by loan (via reference_no containing loan id)
 *   from      — start date (YYYY-MM-DD)
 *   to        — end date (YYYY-MM-DD)
 *   type      — transaction type filter (DISBURSEMENT, REPAYMENT, PROVISION)
 *   status    — journal entry status filter (POSTED, DRAFT)
 *   page      — page number (default 1)
 *   limit     — items per page (default 100)
 *
 * Returns: { data: [...], summary: {...}, pagination: {...} }
 */
router.get('/loan-journal/ledger', async (req, res) => {
    try {
        const {
            loan_id,
            from,
            to,
            type,
            status,
            page = 1,
            limit = 200
        } = req.query;

        // === Build WHERE clause for journal_entries ===
        const where = {};

        if (from || to) {
            where.transaction_date = {};
            if (from) where.transaction_date[Op.gte] = from;
            if (to) where.transaction_date[Op.lte] = to;
        }

        if (loan_id) {
            where.reference_no = { [Op.like]: `LOAN-%-${loan_id}-%` };
        }

        if (type) {
            const typeMap = {
                'DISBURSEMENT': 'LOAN-DIS-%',
                'REPAYMENT': 'LOAN-REP-%',
                'PROVISION': 'LOAN-PRV-%',
            };
            if (typeMap[type]) {
                where.reference_no = {
                    ...(where.reference_no || {}),
                    [Op.like]: typeMap[type]
                };
            }
        }

        if (status) {
            where.status = status;
        }

        // If no specific filters, only show loan-related entries
        if (!loan_id && !type) {
            where.reference_no = { [Op.like]: 'LOAN-%' };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // === Query journal entries with lines ===
        const { count, rows: entries } = await JournalEntry.findAndCountAll({
            where,
            order: [['transaction_date', 'DESC'], ['id', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        // Get all entry IDs
        const entryIds = entries.map(e => e.id);

        // Get all lines for these entries
        let lines = [];
        if (entryIds.length > 0) {
            lines = await JournalEntryLine.findAll({
                where: { journal_entry_id: { [Op.in]: entryIds } },
                order: [['journal_entry_id', 'ASC'], ['id', 'ASC']],
                raw: true
            });
        }

        // Get account names
        const accountCodes = [...new Set(lines.map(l => l.account_code))];
        let accountMap = {};
        if (accountCodes.length > 0) {
            const accounts = await ChartOfAccounts.findAll({
                where: { account_code: { [Op.in]: accountCodes } },
                attributes: ['account_code', 'account_name'],
                raw: true
            });
            accountMap = accounts.reduce((map, a) => {
                map[a.account_code] = a.account_name;
                return map;
            }, {});
        }

        // === Build flat response ===
        const data = [];
        let totalDebit = 0;
        let totalCredit = 0;

        for (const entry of entries) {
            const entryLines = lines
                .filter(l => l.journal_entry_id === entry.id)
                .map(l => ({
                    line_id: l.id,
                    account_code: l.account_code,
                    account_name: accountMap[l.account_code] || l.account_code,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                    description: l.description || ''
                }));

            const entryDebit = entryLines.reduce((sum, l) => sum + l.debit, 0);
            const entryCredit = entryLines.reduce((sum, l) => sum + l.credit, 0);
            totalDebit += entryDebit;
            totalCredit += entryCredit;

            // Determine transaction type from reference_no
            let txnType = 'OTHER';
            const ref = entry.reference_no || '';
            if (ref.includes('LOAN-DIS')) txnType = 'DISBURSEMENT';
            else if (ref.includes('LOAN-REP')) txnType = 'REPAYMENT';
            else if (ref.includes('LOAN-PRV')) txnType = 'PROVISION';

            data.push({
                id: entry.id,
                transaction_date: entry.transaction_date,
                reference_no: entry.reference_no,
                description: entry.description,
                status: entry.status,
                transaction_type: txnType,
                total_debit: entryDebit,
                total_credit: entryCredit,
                is_balanced: Math.abs(entryDebit - entryCredit) < 0.01,
                lines: entryLines
            });
        }

        // === Loan summary (if loan_id provided) ===
        let loanSummary = null;
        if (loan_id) {
            const loan = await Loan.findByPk(loan_id, { raw: true });
            if (loan) {
                loanSummary = {
                    id: loan.id,
                    account_number: loan.account_number,
                    approved_balance: parseFloat(loan.approved_balance) || 0,
                    remaining_balance: parseFloat(loan.remaining_balance) || 0,
                    interest_rate: parseFloat(loan.interest_rate) || 0,
                    loan_status: loan.loan_status,
                    from_date: loan.from_date,
                    to_date: loan.to_date,
                    currency_code: loan.currency_code || 'LAK'
                };
            }
        }

        res.json({
            data,
            summary: {
                total_debit: totalDebit,
                total_credit: totalCredit,
                is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
                entry_count: count
            },
            loan: loanSummary,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit))
            },
            status: true,
            message: 'Select successfully'
        });
    } catch (error) {
        console.error('❌ Error in loan-journal/ledger:', error.message);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message,
            status: false
        });
    }
});

/**
 * GET /loan-journal/summary
 * ສະຫຼຸບ ລາຍການ ທັງໝົດ ແບ່ງ ຕາມ ປະເພດ
 */
router.get('/loan-journal/summary', async (req, res) => {
    try {
        const { from, to } = req.query;
        const where = { reference_no: { [Op.like]: 'LOAN-%' } };

        if (from || to) {
            where.transaction_date = {};
            if (from) where.transaction_date[Op.gte] = from;
            if (to) where.transaction_date[Op.lte] = to;
        }

        const entries = await JournalEntry.findAll({ where, raw: true });
        const entryIds = entries.map(e => e.id);

        let totalDisbursement = 0;
        let totalRepaymentPrincipal = 0;
        let totalRepaymentInterest = 0;
        let totalPenalty = 0;
        let totalProvision = 0;

        if (entryIds.length > 0) {
            const lines = await JournalEntryLine.findAll({
                where: { journal_entry_id: { [Op.in]: entryIds } },
                raw: true
            });

            for (const entry of entries) {
                const ref = entry.reference_no || '';
                const entryLines = lines.filter(l => l.journal_entry_id === entry.id);

                if (ref.includes('LOAN-DIS')) {
                    totalDisbursement += entryLines
                        .filter(l => l.account_code && l.account_code.startsWith('11'))
                        .reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
                } else if (ref.includes('LOAN-REP')) {
                    totalRepaymentPrincipal += entryLines
                        .filter(l => l.account_code && l.account_code.startsWith('11'))
                        .reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
                    totalRepaymentInterest += entryLines
                        .filter(l => l.account_code && l.account_code.startsWith('41'))
                        .reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
                    totalPenalty += entryLines
                        .filter(l => l.account_code && l.account_code.startsWith('42'))
                        .reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
                } else if (ref.includes('LOAN-PRV')) {
                    totalProvision += entryLines
                        .filter(l => l.account_code && l.account_code.startsWith('62'))
                        .reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
                }
            }
        }

        res.json({
            data: {
                total_disbursement: totalDisbursement,
                total_repayment_principal: totalRepaymentPrincipal,
                total_repayment_interest: totalRepaymentInterest,
                total_penalty: totalPenalty,
                total_provision: totalProvision,
                net_loan_outstanding: totalDisbursement - totalRepaymentPrincipal,
                entry_count: entries.length
            },
            status: true,
            message: 'Summary generated successfully'
        });
    } catch (error) {
        console.error('❌ Error in loan-journal/summary:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message, status: false });
    }
});

/**
 * GET /loan-journal/accounts
 * ລາຍຊື່ ບັນຊີ ທີ່ ໃຊ້ ໃນ ທຸລະກຳ ເງິນ ກູ້
 */
router.get('/loan-journal/accounts', async (req, res) => {
    try {
        const loanAccountCodes = ['1110', '1120', '1130', '4111', '4112', '4210', '4220', '6210', '1010', '1030'];
        const accounts = await ChartOfAccounts.findAll({
            where: {
                account_code: {
                    [Op.or]: loanAccountCodes.map(code => ({ [Op.like]: `${code}%` }))
                }
            },
            order: [['account_code', 'ASC']],
            raw: true
        });
        res.json({ data: accounts, status: true });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message, status: false });
    }
});

module.exports = router;
