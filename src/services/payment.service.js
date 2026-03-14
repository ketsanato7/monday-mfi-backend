/**
 * payment.service.js — Loan installment payment + auto JE
 */
const logger = require('../config/logger');
const db = require('../models');
const { createJournalEntry } = require('../engines/accountingEngine');

class PaymentService {
    static async loanPayment(body) {
        const t = await db.sequelize.transaction();
        try {
            const { loan_id, schedule_id, installment_no, principal_amount=0, interest_amount=0, penalty_amount=0, total_amount, paid_amount, payment_method, payment_type, bank_code, bank_name, bank_account_name, bank_account_no } = body;
            if (!loan_id || !schedule_id || !paid_amount || !payment_method) throw Object.assign(new Error('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ'), { status: 400 });
            const pp = parseFloat(principal_amount)||0, ip = parseFloat(interest_amount)||0, pen = parseFloat(penalty_amount)||0, tp = parseFloat(paid_amount)||0;
            const RS = db['repayment_schedules'];
            if (RS) { const s = await RS.findByPk(schedule_id); if (s) { const np = parseFloat(s.paid_principal||0)+pp, ni = parseFloat(s.paid_interest||0)+ip, npe = parseFloat(s.paid_penalty||0)+pen, na = parseFloat(s.paid_amount||0)+tp; const st = na >= (parseFloat(s.total_amount||0)+parseFloat(s.penalty_amount||0)) ? 'PAID' : na > 0 ? 'PARTIAL' : 'PENDING'; await RS.update({ paid_amount: na, paid_principal: np, paid_interest: ni, paid_penalty: npe, status: st }, { where: { id: schedule_id }, transaction: t }); } }
            const LT = db['loan_transactions']; const refNo = `PAY-${Date.now()}`; let tr = null;
            if (LT) tr = await LT.create({ loan_id, transaction_date: new Date(), amount: tp, type: 'REPAYMENT', payment_method, reference_no: refNo, created_by: 1 }, { transaction: t });
            let jr = null; try { jr = await createJournalEntry({ templateName: payment_method === 'BANK_TRANSFER' ? 'LOAN_REPAYMENT_BANK' : 'LOAN_REPAYMENT', amounts: { total: tp, principal: pp, interest: ip + pen }, referenceNo: refNo, userId: 1, description: `ສັນຍາ #${loan_id} ງວດ #${installment_no} — ${payment_type || 'ຊຳລະ'}` }); } catch (e) { logger.error('⚠️ JE non-blocking:', e.message); }
            await t.commit();
            return { success: true, message: 'ບັນທຶກການຊຳລະສຳເລັດ', receipt: { receipt_no: refNo, loan_id, installment_no, principal_amount: pp, interest_amount: ip, penalty_amount: pen, total_amount: parseFloat(total_amount) || tp, paid_amount: tp, payment_method, payment_type: payment_type || 'ຊຳລະທັງໝົດ', bank_code: bank_code||null, bank_name: bank_name||null, bank_account_name: bank_account_name||null, bank_account_no: bank_account_no||null, transaction_date: new Date().toISOString(), journal_entry_id: jr?.journalEntryId || null, journal_ref: jr?.referenceNo || null } };
        } catch (e) { await t.rollback(); throw e; }
    }
    static async repaymentSchedules(loanId) {
        const RS = db['repayment_schedules']; if (!RS) throw new Error('repayment_schedules model not found');
        return await RS.findAll({ where: { loan_id: loanId }, order: [['installment_no', 'ASC']] });
    }
}

module.exports = PaymentService;
