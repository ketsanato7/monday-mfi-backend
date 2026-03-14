/**
 * jdbCallback.service.js — JDB QR route logic extraction
 */
const logger = require('../config/logger');
const db = require('../models');
const jdbService = require('./jdb.service');

class JdbCallbackService {
    static async generateQR({ amount, contractId, installmentNo, branchId, paymentType, mobileNo }) {
        if (!amount || amount <= 0) throw Object.assign(new Error('ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ'), { status: 400 });
        const type = (paymentType || 'R').charAt(0).toUpperCase();
        const seq = String(Date.now() % 1000).padStart(3, '0');
        const bCode = (branchId || '0').toString().slice(0, 3);
        const billNumber = `M${contractId || 0}.${installmentNo || 0}.${bCode}.${type}${seq}`.slice(0, 25);
        const result = await jdbService.generateQR({ amount, billNumber, mobileNo });
        try { await db.jdb_transactions.create({ requestId: result.transactionId || billNumber, partnerId: 'MPAY', billNumber, txnAmount: amount, currency: 'LAK', mobileNo: mobileNo || null, transactionType: 'GENERATE_QR', status: 'PENDING', apiResponse: JSON.stringify(result), emv: result.emv, contract_id: contractId || null, installment_no: installmentNo || null, branch_id: branchId || null, payment_type: type }); } catch (e) { logger.error('⚠️ jdb save fail:', e.message); }
        return { message: 'ສ້າງ QR ສຳເລັດ', data: result, status: true };
    }

    static async check(billNumber) {
        const r = await jdbService.checkTransaction(billNumber);
        const paid = r.success && r.data?.message === 'SUCCESS';
        return { message: paid ? 'ຈ່າຍສຳເລັດ' : 'ລໍຖ້າ', data: r.data || null, paid, jdbResponse: r, status: true };
    }

    static async checkRef({ bankCode, reference }) {
        if (!reference) throw Object.assign(new Error('ກະລຸນາລະບຸ reference'), { status: 400 });
        return { message: 'ກວດສອບສຳເລັດ', data: (await jdbService.checkTransactionByRef({ bankCode, reference })).data || null, status: true };
    }

    static async disableBill(billNumber) {
        if (!billNumber) throw Object.assign(new Error('ກະລຸນາລະບຸ billNumber'), { status: 400 });
        return { message: 'ຍົກເລີກ bill ສຳເລັດ', data: (await jdbService.disableBill(billNumber)).data || null, status: true };
    }

    static async refund({ txnAmount, billNumber, remark }) {
        if (!billNumber || !txnAmount) throw Object.assign(new Error('ກະລຸນາລະບຸ billNumber ແລະ txnAmount'), { status: 400 });
        return { message: 'ຄືນເງິນສຳເລັດ', data: (await jdbService.refund({ txnAmount, billNumber, remark })).data || null, status: true };
    }

    static async handleCallback(body, headers) {
        const t = await db.sequelize.transaction();
        try {
            const signedHash = headers['signedhash'] || headers['SignedHash'];
            if (process.env.JDB_SIGN_SECRET && signedHash && signedHash !== jdbService.generateSignedHash(JSON.stringify(body))) { await t.rollback(); throw Object.assign(new Error('Invalid SignedHash'), { status: 401 }); }
            const { billNumber, txnAmount, refNo, sourceName, sourceBank } = body;
            const amount = parseFloat(txnAmount) || 0;
            await db.jdb_transactions.update({ status: 'PAID', refNumber: refNo || null, apiResponse: JSON.stringify(body) }, { where: { billNumber }, transaction: t });
            let contractId = null, installmentNo = null, parsedBranch = null, pType = 'R';
            const sm = billNumber.match(/^M(\d+)\.(\d+)\.([^.]+)\.([RFPO])(\d+)$/);
            const lg = billNumber.match(/^MPAY(\d+)T/);
            if (sm) { contractId = +sm[1]; installmentNo = +sm[2]; parsedBranch = sm[3]; pType = sm[4]; } else if (lg) contractId = +lg[1];
            if (contractId > 0) {
                const contract = await db.loan_contracts.findByPk(contractId, { transaction: t });
                if (contract) {
                    let tgt = installmentNo > 0 ? await db.loan_repayment_schedules.findOne({ where: { contract_id: contractId, installment_no: installmentNo }, transaction: t }) : null;
                    if (!tgt) tgt = await db.loan_repayment_schedules.findOne({ where: { contract_id: contractId, is_paid: false }, order: [['installment_no', 'ASC']], transaction: t });
                    let pp = 0, ip = 0, ai = installmentNo;
                    if (tgt) { pp = parseFloat(tgt.principal_due) || 0; ip = parseFloat(tgt.interest_due) || 0; ai = tgt.installment_no; await tgt.update({ is_paid: true, paid_amount: amount, paid_principal: pp, paid_interest: ip, status: 'PAID' }, { transaction: t }); }
                    await db.loan_transactions.create({ contract_id: contractId, transaction_date: new Date(), transaction_type: 'REPAYMENT', amount_paid: amount, principal_paid: pp, interest_paid: ip, penalty_paid: 0, payment_method: 'JDB_QR', reference_no: billNumber, installment_no: ai || null, branch_id: parsedBranch || null }, { transaction: t });
                    if (pp > 0) await db.loan_contracts.decrement('remaining_balance', { by: pp, where: { id: contractId }, transaction: t });
                    const FR = parseFloat(process.env.IT_FEE_RATE || '0.005'), MN = +(process.env.IT_FEE_MIN || 1000), MX = +(process.env.IT_FEE_MAX || 50000);
                    await db.loan_fees.create({ loan_id: contractId, fee_type: 'IT_QR_FEE', fee_amount: Math.min(Math.max(amount * FR, MN), MX), deducted_from_loan: false, notes: `QR fee ${billNumber}` }, { transaction: t });
                }
            }
            await db.audit_logs.create({ action: 'JDB_PAYMENT_CALLBACK', table_name: 'jdb_transactions', record_id: billNumber, new_values: { billNumber, txnAmount: amount, refNo, sourceName, sourceBank }, description: `JDB QR: ${amount} LAK`, created_at: new Date() }, { transaction: t });
            try { await db.notifications.create({ type: 'PAYMENT', title: '💰 QR ສຳເລັດ', message: `${sourceName || 'N/A'} ${amount.toLocaleString()} LAK`, entity_type: 'jdb_transactions', entity_id: contractId || 0, is_read: false }, { transaction: t }); } catch (_) {}
            await t.commit();
            return { message: 'Callback received', status: true };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async testConnection() {
        const net = require('net');
        const cfg = { baseUrl: process.env.JDB_BASE_URL || '❌ NOT SET', partnerId: process.env.JDB_PARTNER_ID || '❌ NOT SET', clientId: process.env.JDB_CLIENT_ID || '❌ NOT SET', hasClientSecret: !!process.env.JDB_CLIENT_SECRET, callbackUrl: process.env.JDB_CALLBACK_URL || 'NOT SET' };
        let ip = 'unknown'; try { ip = (await require('axios').get('https://api.ipify.org?format=json', { timeout: 5000 })).data.ip; } catch { ip = 'N/A'; }
        let tcp = false; try { const u = new URL(process.env.JDB_BASE_URL); tcp = await new Promise(r => { const s = new net.Socket(); s.setTimeout(3000); s.on('connect', () => { s.destroy(); r(true); }); s.on('timeout', () => { s.destroy(); r(false); }); s.on('error', () => { s.destroy(); r(false); }); s.connect(parseInt(u.port) || 443, u.hostname); }); } catch {}
        if (!tcp) return { message: '❌ JDB ເຊື່ອມຕໍ່ບໍ່ໄດ້', data: { cfg, ip, tcpReachable: false }, status: false };
        try { const tk = await jdbService.authenticate(); return { message: '✅ JDB OK', data: { cfg, ip, tcpReachable: true, authenticated: true, tokenPreview: tk?.slice(0, 20) + '...' }, status: true }; }
        catch (e) { return { message: `❌ Auth fail: ${e.message}`, data: { cfg, ip, tcpReachable: true, authenticated: false }, status: false }; }
    }
}

module.exports = JdbCallbackService;
