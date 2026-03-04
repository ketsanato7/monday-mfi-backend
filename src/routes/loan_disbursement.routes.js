/**
 * loan_disbursement.routes.js — API ສຳລັບ ປ່ອຍ ເງິນ ກູ້
 *
 * GET  /api/loan-disbursement/pending       → ລາຍການ ກູ້ ທີ່ APPROVED ລໍ ປ່ອຍ
 * POST /api/loan-disbursement/disburse/:id  → ປ່ອຍ ເງິນ ກູ້ + ສ້າງ JE ອັດຕະໂນມັດ
 * GET  /api/loan-disbursement/history       → ປະ ຫວັດ ການ ປ່ອຍ ເງິນ ກູ້
 */
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../models');
const { requirePermission } = require('../middleware/rbac');
const { createJournalEntry } = require('../engines/accountingEngine');

const LoanApplication = db['loan_applications'];
const JournalEntry = db['journal_entries'];
const JournalEntryLine = db['journal_entry_lines'];

// ═══════════════════════════════════════════════════════
// GET /loan-disbursement/cash-balance
// ດຶງ ຍອດ ເງິນ ສົດ ຈາກ trial_balance (account 1011)
// ═══════════════════════════════════════════════════════
router.get('/loan-disbursement/cash-balance', async (req, res) => {
    try {
        const TrialBalance = db['trial_balance'];
        const ChartOfAccounts = db['chart_of_accounts'];

        let balance = 0;

        if (TrialBalance && ChartOfAccounts) {
            // ດຶງ account_id ຂອງ 1011 (ເງິນ ສົດ ໃນ ຄັງ)
            const cashAccount = await ChartOfAccounts.findOne({
                where: { account_code: '1011' },
                raw: true,
            });

            if (cashAccount) {
                const tb = await TrialBalance.findOne({
                    where: { account_id: cashAccount.id },
                    order: [['id', 'DESC']],
                    raw: true,
                });
                if (tb) {
                    balance = parseFloat(tb.debit_balance || 0) - parseFloat(tb.credit_balance || 0);
                }
            }
        }

        res.json({ balance, status: true });
    } catch (error) {
        console.error('❌ Error fetching cash balance:', error.message);
        res.status(500).json({ message: error.message, status: false, balance: 0 });
    }
});

// ═══════════════════════════════════════════════════════
// GET /loan-disbursement/pending
// ลาย ການ ກູ້ ທີ່ APPROVED ລໍ ປ່ອຍ
// ═══════════════════════════════════════════════════════
router.get('/loan-disbursement/pending', async (req, res) => {
    try {
        if (!LoanApplication) {
            return res.status(500).json({ message: 'loan_applications model not found', status: false });
        }

        const loans = await LoanApplication.findAll({
            where: { status: 'APPROVED' },
            order: [['id', 'DESC']],
            raw: true,
        });

        res.json({
            data: loans,
            count: loans.length,
            status: true,
            message: 'Select successfully',
        });
    } catch (error) {
        console.error('❌ Error fetching pending disbursements:', error.message);
        res.status(500).json({ message: error.message, status: false });
    }
});

// ═══════════════════════════════════════════════════════
// POST /loan-disbursement/disburse/:id
// ປ່ອຍ ເງິນ ກູ້ + ສ້າງ JE ອັດຕະໂນມັດ
// ═══════════════════════════════════════════════════════
router.post('/loan-disbursement/disburse/:id', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const { id } = req.params;
        const { userId = 1, paymentMethod = 'CASH' } = req.body;

        if (!LoanApplication) {
            return res.status(500).json({ message: 'loan_applications model not found', status: false });
        }

        // 1. ດຶງ ບັນທຶກ ກູ້
        const loan = await LoanApplication.findByPk(id, { raw: true });
        if (!loan) {
            return res.status(404).json({ message: `ບໍ່ ພົບ ບັນທຶກ ກູ້ #${id}`, status: false });
        }

        // 2. ກວດ status
        if (loan.status !== 'APPROVED') {
            return res.status(400).json({
                message: `ສະຖານະ ປັດ ຈຸ ບັນ: ${loan.status}. ຕ້ອງ ເປັນ APPROVED ກ່ອນ ປ່ອຍ`,
                status: false,
            });
        }

        // 3. ກຳ ນົດ ຈຳ ນວນ ເງິນ
        const amount = parseFloat(loan.requested_amount)
            || parseFloat(loan.recommended_amount)
            || parseFloat(loan.approved_amount)
            || parseFloat(loan.loan_amount)
            || parseFloat(loan.amount)
            || 0;

        if (amount <= 0) {
            return res.status(400).json({
                message: 'ບໍ່ ສາ ມາດ ປ່ອຍ ເງິນ 0 ₭',
                status: false,
            });
        }

        // 4. ເລືອກ template ຕາມ ວິ ທີ ຈ່າຍ
        const templateName = paymentMethod === 'BANK'
            ? 'LOAN_DISBURSEMENT_BANK'
            : 'LOAN_DISBURSEMENT';

        // 5. ສ້າງ JE ອັດ ຕະ ໂນ ມັດ
        const refNo = `LOAN-DIS-${id}-${Date.now()}`;
        let journalResult = null;

        try {
            journalResult = await createJournalEntry({
                templateName: 'LOAN_DISBURSEMENT', // always use this template
                amounts: amount,
                referenceNo: refNo,
                userId,
                description: `ປ່ອຍ ເງິນ ກູ້ #${id} ໃຫ້ ລູກ ຄ້າ — ${amount.toLocaleString()} ₭`,
            });
        } catch (jeError) {
            console.error('⚠️ Auto-journal failed:', jeError.message);
        }

        // 6. ອັບ ເດດ status → DISBURSED
        await LoanApplication.update(
            { status: 'DISBURSED' },
            { where: { id } }
        );

        // 7. ບັນ ທຶກ loan_transactions (ຖ້າ model ມີ)
        const LoanTransaction = db['loan_transactions'];
        if (LoanTransaction) {
            try {
                await LoanTransaction.create({
                    contract_id: id,
                    transaction_date: new Date(),
                    transaction_type: 'DISBURSEMENT',
                    amount_paid: amount,
                    principal_paid: amount,
                    interest_paid: 0,
                    penalty_paid: 0,
                    payment_method: paymentMethod,
                    reference_no: refNo,
                    processed_by: userId,
                });
            } catch (txError) {
                console.error('⚠️ Transaction record failed:', txError.message);
            }
        }

        res.json({
            message: `ປ່ອຍ ເງິນ ກູ້ #${id} ຈຳ ນວນ ${amount.toLocaleString()} ₭ ສຳ ເລັດ`,
            data: {
                loanId: parseInt(id),
                amount,
                newStatus: 'DISBURSED',
                journalEntry: journalResult,
                referenceNo: refNo,
            },
            status: true,
        });
    } catch (error) {
        console.error('❌ Error disbursing loan:', error.message);
        res.status(500).json({ message: error.message, status: false });
    }
});

// ═══════════════════════════════════════════════════════
// GET /loan-disbursement/history
// ປະ ຫວັດ ການ ປ່ອຍ ເງິນ ກູ້
// ═══════════════════════════════════════════════════════
router.get('/loan-disbursement/history', async (req, res) => {
    try {
        const { from, to, page = 1, limit = 50 } = req.query;

        // ດຶງ JE ທີ່ reference ເປັນ LOAN-DIS
        if (!JournalEntry) {
            return res.json({ data: [], count: 0, status: true });
        }

        const where = {
            reference_no: { [Op.like]: 'LOAN-DIS-%' },
            status: 'POSTED',
        };

        if (from || to) {
            where.transaction_date = {};
            if (from) where.transaction_date[Op.gte] = from;
            if (to) where.transaction_date[Op.lte] = to;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await JournalEntry.findAndCountAll({
            where,
            order: [['transaction_date', 'DESC'], ['id', 'DESC']],
            limit: parseInt(limit),
            offset,
            raw: true,
        });

        res.json({
            data: rows,
            count,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                totalPages: Math.ceil(count / parseInt(limit)),
            },
            status: true,
            message: 'Select successfully',
        });
    } catch (error) {
        console.error('❌ Error fetching disbursement history:', error.message);
        res.status(500).json({ message: error.message, status: false });
    }
});

module.exports = router;
