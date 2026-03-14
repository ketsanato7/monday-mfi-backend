/**
 * zodSchemas.js — Zod validation schemas for financial endpoints
 * ── ກວດ ສອບ ຂໍ້ ມູນ ທີ່ ເຂົ້າ ມາ ກ່ອນ ບັນ ທຶກ ──
 */
const { z } = require('zod');

// ═══════════════════════════════════════════
// Loan Disbursement
// ═══════════════════════════════════════════
const disburseLoan = z.object({
    method: z.enum(['CASH', 'TRANSFER', 'QR', 'CHEQUE'], {
        required_error: 'ຕ້ອງລະບຸ method (CASH/TRANSFER/QR/CHEQUE)',
    }),
    mobileNo: z.string().optional(),
});

// ═══════════════════════════════════════════
// Loan Repayment
// ═══════════════════════════════════════════
const loanRepayment = z.object({
    amount: z.number({ required_error: 'ຕ້ອງລະບຸ amount' }).positive('amount ຕ້ອງມີຄ່າ > 0'),
    payment_type: z.string().optional(),
    notes: z.string().optional(),
});

// ═══════════════════════════════════════════
// Deposit Operation
// ═══════════════════════════════════════════
const depositOp = z.object({
    account_id: z.number({ required_error: 'ຕ້ອງລະບຸ account_id' }).int().positive(),
    amount: z.number({ required_error: 'ຕ້ອງລະບຸ amount' }).positive('amount ຕ້ອງມີຄ່າ > 0'),
    txn_type: z.string().optional(),
    reference_no: z.string().optional(),
    notes: z.string().optional(),
});

// ═══════════════════════════════════════════
// Withdrawal
// ═══════════════════════════════════════════
const withdrawOp = z.object({
    account_id: z.number({ required_error: 'ຕ້ອງລະບຸ account_id' }).int().positive(),
    amount: z.number({ required_error: 'ຕ້ອງລະບຸ amount' }).positive('amount ຕ້ອງມີຄ່າ > 0'),
    reference_no: z.string().optional(),
    notes: z.string().optional(),
});

// ═══════════════════════════════════════════
// Loan Payment (payment.routes.js)
// ═══════════════════════════════════════════
const loanPayment = z.object({
    contract_id: z.number({ required_error: 'ຕ້ອງລະບຸ contract_id' }).int().positive(),
    amount: z.number({ required_error: 'ຕ້ອງລະບຸ amount' }).positive('amount ຕ້ອງມີຄ່າ > 0'),
    payment_type: z.string().optional(),
    payment_date: z.string().optional(),
    notes: z.string().optional(),
});

// ═══════════════════════════════════════════
// IT Fee Charge
// ═══════════════════════════════════════════
const itFeeCharge = z.object({
    fee_type: z.string({ required_error: 'ຕ້ອງລະບຸ fee_type' }).min(1),
    amount: z.number().positive().optional(),
    loan_id: z.number().int().positive().optional().nullable(),
    mfi_id: z.number().int().positive().optional().nullable(),
    notes: z.string().optional(),
    billing_period: z.string().optional().nullable(),
});

// ═══════════════════════════════════════════
// HR — Payroll Calculate
// ═══════════════════════════════════════════
const payrollCalculate = z.object({
    payroll_month: z.string({ required_error: 'ຕ້ອງລະບຸ payroll_month' })
        .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'ຮູບແບບ: YYYY-MM ຫຼື YYYY-MM-DD'),
    employee_ids: z.array(z.number().int().positive()).optional(),
});

// ═══════════════════════════════════════════
// HR — Leave Request
// ═══════════════════════════════════════════
const leaveRequest = z.object({
    employee_id: z.number({ required_error: 'ຕ້ອງລະບຸ employee_id' }).int().positive(),
    leave_type_id: z.number({ required_error: 'ຕ້ອງລະບຸ leave_type_id' }).int().positive(),
    start_date: z.string({ required_error: 'ຕ້ອງລະບຸ start_date' }),
    end_date: z.string({ required_error: 'ຕ້ອງລະບຸ end_date' }),
    total_days: z.number({ required_error: 'ຕ້ອງລະບຸ total_days' }).positive('total_days ຕ້ອງ > 0'),
    reason: z.string().optional(),
    attachment_url: z.string().url().optional().nullable(),
});

module.exports = {
    disburseLoan,
    loanRepayment,
    depositOp,
    withdrawOp,
    loanPayment,
    itFeeCharge,
    payrollCalculate,
    leaveRequest,
};
