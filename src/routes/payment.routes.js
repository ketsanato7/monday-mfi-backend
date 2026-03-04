/**
 * payment.routes.js — Loan Installment Payment API
 * ✅ ລົງບັນຊີ double-entry ອັດຕະໂນມັດ ຕາມ BOL Chart of Accounts
 * ✅ ຮອງຮັບ partial payment (ດອກ/ປັບໄໝ/ຕົ້ນ/ທັງໝົດ)
 * ✅ ຮອງຮັບ bank selection ສຳລັບ ເງິນໂອນ
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const { requirePermission } = require('../middleware/rbac');
const { createJournalEntry } = require('../engines/accountingEngine');

/**
 * POST /api/loan-payment
 * ຮັບຊຳລະງວດ (full ຫຼື partial)
 *
 * Body: {
 *   loan_id, schedule_id, installment_no,
 *   principal_amount, interest_amount, penalty_amount,
 *   total_amount, paid_amount,
 *   payment_method: 'CASH' | 'BANK_TRANSFER',
 *   payment_type: 'ຊຳລະທັງໝົດ' | 'ຊຳລະ: ດອກເບ້ຍ' | ...,
 *   bank_code?, bank_name?, bank_account_name?, bank_account_no?
 * }
 */
router.post('/loan-payment', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    const sequelize = db.sequelize;
    const t = await sequelize.transaction();
    try {
        const {
            loan_id,
            schedule_id,
            installment_no,
            principal_amount = 0,
            interest_amount = 0,
            penalty_amount = 0,
            total_amount,
            paid_amount,
            payment_method,
            payment_type,
            bank_code,
            bank_name,
            bank_account_name,
            bank_account_no,
        } = req.body;

        // 1. Validate
        if (!loan_id || !schedule_id || !paid_amount || !payment_method) {
            return res.status(400).json({ message: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ' });
        }

        const principalPay = parseFloat(principal_amount) || 0;
        const interestPay = parseFloat(interest_amount) || 0;
        const penaltyPay = parseFloat(penalty_amount) || 0;
        const totalPay = parseFloat(paid_amount) || 0;

        // 2. Update repayment_schedules — accumulate partial payments
        const RepaymentSchedule = db['repayment_schedules'];
        if (RepaymentSchedule) {
            const schedule = await RepaymentSchedule.findByPk(schedule_id);
            if (schedule) {
                const newPaidPrincipal = parseFloat(schedule.paid_principal || 0) + principalPay;
                const newPaidInterest = parseFloat(schedule.paid_interest || 0) + interestPay;
                const newPaidPenalty = parseFloat(schedule.paid_penalty || 0) + penaltyPay;
                const newPaidAmount = parseFloat(schedule.paid_amount || 0) + totalPay;

                // Determine status
                const scheduleTotal = parseFloat(schedule.total_amount || 0) + parseFloat(schedule.penalty_amount || 0);
                let newStatus = 'PENDING';
                if (newPaidAmount >= scheduleTotal) {
                    newStatus = 'PAID';
                } else if (newPaidAmount > 0) {
                    newStatus = 'PARTIAL';
                }

                await RepaymentSchedule.update(
                    {
                        paid_amount: newPaidAmount,
                        paid_principal: newPaidPrincipal,
                        paid_interest: newPaidInterest,
                        paid_penalty: newPaidPenalty,
                        status: newStatus,
                    },
                    { where: { id: schedule_id }, transaction: t }
                );
            }
        }

        // 3. Insert loan_transactions
        const LoanTransaction = db['loan_transactions'];
        const refNo = `PAY-${Date.now()}`;
        let transactionRecord = null;
        if (LoanTransaction) {
            transactionRecord = await LoanTransaction.create({
                loan_id: loan_id,
                transaction_date: new Date(),
                amount: totalPay,
                type: 'REPAYMENT',
                payment_method: payment_method,
                reference_no: refNo,
                created_by: 1, // TODO: get from auth
            }, { transaction: t });
        }

        // 4. Create Journal Entry (Double-entry bookkeeping)
        //    Only create entries for amounts > 0
        const templateName = payment_method === 'BANK_TRANSFER'
            ? 'LOAN_REPAYMENT_BANK'
            : 'LOAN_REPAYMENT';

        let journalResult = null;
        try {
            journalResult = await createJournalEntry({
                templateName,
                amounts: {
                    total: totalPay,
                    principal: principalPay,
                    interest: interestPay + penaltyPay, // penalty ລວມກັບ interest income
                },
                referenceNo: refNo,
                userId: 1,
                description: `ສັນຍາ #${loan_id} ງວດ #${installment_no} — ${payment_type || 'ຊຳລະ'}`,
            });
        } catch (journalErr) {
            console.error('⚠️ Journal entry error (non-blocking):', journalErr.message);
        }

        await t.commit();

        // 5. Return receipt data
        res.json({
            success: true,
            message: 'ບັນທຶກການຊຳລະສຳເລັດ',
            receipt: {
                receipt_no: refNo,
                loan_id,
                installment_no,
                principal_amount: principalPay,
                interest_amount: interestPay,
                penalty_amount: penaltyPay,
                total_amount: parseFloat(total_amount) || totalPay,
                paid_amount: totalPay,
                payment_method,
                payment_type: payment_type || 'ຊຳລະທັງໝົດ',
                bank_code: bank_code || null,
                bank_name: bank_name || null,
                bank_account_name: bank_account_name || null,
                bank_account_no: bank_account_no || null,
                transaction_date: new Date().toISOString(),
                journal_entry_id: journalResult ? journalResult.journalEntryId : null,
                journal_ref: journalResult ? journalResult.referenceNo : null,
            },
        });
    } catch (err) {
        await t.rollback();
        console.error('❌ loan-payment error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * GET /api/repayment-schedules/:loan_id
 * ດຶງ ຕາຕະລາງການຊຳລະງວດ ສຳລັບ 1 ສັນຍາ
 */
router.get('/repayment-schedules/:loan_id', async (req, res) => {
    try {
        const { loan_id } = req.params;
        const RepaymentSchedule = db['repayment_schedules'];
        if (!RepaymentSchedule) {
            return res.status(500).json({ message: 'repayment_schedules model not found' });
        }

        const schedules = await RepaymentSchedule.findAll({
            where: { loan_id },
            order: [['installment_no', 'ASC']],
        });
        res.json(schedules);
    } catch (err) {
        console.error('❌ repayment-schedules error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
