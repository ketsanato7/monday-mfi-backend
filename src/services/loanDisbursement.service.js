/**
 * loanDisbursement.service.js — Disburse loans + auto JE
 */
const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { createJournalEntry } = require('../engines/accountingEngine');
const bol = require('../middleware/bol-compliance');
const LA = db['loan_applications'], JE = db['journal_entries'];

class LoanDisbursementService {
    static async cashBalance() {
        const COA = db['chart_of_accounts'], TB = db['trial_balance']; let balance = 0;
        if (TB && COA) { const ca = await COA.findOne({ where: { account_code: '1011' }, raw: true }); if (ca) { const tb = await TB.findOne({ where: { account_id: ca.id }, order: [['id','DESC']], raw: true }); if (tb) balance = parseFloat(tb.debit_balance||0) - parseFloat(tb.credit_balance||0); } }
        return { balance, status: true };
    }
    static async pending() { if (!LA) throw new Error('loan_applications model not found'); return { data: await LA.findAll({ where: { status: 'APPROVED' }, order: [['id','DESC']], raw: true }), status: true, message: 'Select successfully' }; }
    static async disburse(id, body) {
        if (!LA) throw new Error('loan_applications model not found');
        const loan = await LA.findByPk(id, { raw: true }); if (!loan) throw Object.assign(new Error(`ບໍ່ພົບ #${id}`), { status: 404 });
        if (loan.status !== 'APPROVED') throw Object.assign(new Error(`ສະຖານະ: ${loan.status}. ຕ້ອງ APPROVED`), { status: 400 });
        const amount = parseFloat(loan.requested_amount) || parseFloat(loan.recommended_amount) || parseFloat(loan.approved_amount) || parseFloat(loan.loan_amount) || parseFloat(loan.amount) || 0;
        if (amount <= 0) throw Object.assign(new Error('ບໍ່ສາມາດປ່ອຍ 0₭'), { status: 400 });
        const cc = bol.validateLoanCeiling(amount); if (!cc.valid) throw Object.assign(new Error(cc.message), { status: 400 });
        if (amount >= bol.BOL_LIMITS.CTR_THRESHOLD) await bol.createCTRReport({ loanId: id, amount, currencyCode: 'LAK', orgId: 1 });
        const { userId = 1, paymentMethod = 'CASH' } = body; const refNo = `LOAN-DIS-${id}-${Date.now()}`;
        let jr = null; try { jr = await createJournalEntry({ templateName: 'LOAN_DISBURSEMENT', amounts: amount, referenceNo: refNo, userId, description: `ປ່ອຍເງິນກູ້ #${id} — ${amount.toLocaleString()}₭` }); } catch (e) { logger.error('⚠️ JE fail:', e.message); }
        await LA.update({ status: 'DISBURSED' }, { where: { id } });
        const LT = db['loan_transactions']; if (LT) try { await LT.create({ contract_id: id, transaction_date: new Date(), transaction_type: 'DISBURSEMENT', amount_paid: amount, principal_paid: amount, interest_paid: 0, penalty_paid: 0, payment_method: paymentMethod, reference_no: refNo, processed_by: userId }); } catch (e) { logger.error('⚠️ Txn fail:', e.message); }
        return { message: `ປ່ອຍ #${id} ${amount.toLocaleString()}₭ ສຳເລັດ`, data: { loanId: +id, amount, newStatus: 'DISBURSED', journalEntry: jr, referenceNo: refNo }, status: true };
    }
    static async history(query) {
        if (!JE) return { data: [], count: 0, status: true };
        const { from, to, page = 1, limit = 50 } = query; const w = { reference_no: { [Op.like]: 'LOAN-DIS-%' }, status: 'POSTED' };
        if (from || to) { w.transaction_date = {}; if (from) w.transaction_date[Op.gte] = from; if (to) w.transaction_date[Op.lte] = to; }
        const { count, rows } = await JE.findAndCountAll({ where: w, order: [['transaction_date','DESC'],['id','DESC']], limit: +limit, offset: (+page-1)*(+limit), raw: true });
        return { data: rows, count, pagination: { page: +page, limit: +limit, total: count, totalPages: Math.ceil(count/+limit) }, status: true, message: 'Select successfully' };
    }
}

module.exports = LoanDisbursementService;
