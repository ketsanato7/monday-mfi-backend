/**
 * lmps.routes.js — Thin Controller (10 endpoints)
 * ❌ ກ່ອນ: 327 ແຖວ → ✅ ຫຼັງ: ~35 ແຖວ
 * Note: ไຟລ໌ນີ້ already has lmps.service — just wrap with asyncHandler
 */
const router = require('express').Router();
const db = require('../models');
const { requireAuth } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const lmpsService = require('../services/lmps.service');

// ── Incoming (LAPNET → MFI) ──
router.post('/lmps/inquiry', asyncHandler(async (req, res) => {
    const body = req.body, lapnetSig = req.headers['x-lapnet-request-signature'], sourceSig = req.headers['x-source-request-signature'], txnId = req.headers['x-lapnet-transaction-id'];
    const txn = await db.lmps_transactions.create({ direction: 'INCOMING', command_type: 'INQUIRY', lapnet_transaction_id: txnId, from_member: body.frommember, from_user: body.fromuser, from_user_fullname: body.fromuserfullname, from_account: body.fromaccount, from_account_type: body.fromaccounttype, to_type: body.totype, to_account: body.toaccount, to_member: body.tomember, reference: body.reference, request_time: body.time, source_signature: sourceSig, lapnet_request_signature: lapnetSig, raw_request: JSON.stringify(body), status: 'PROCESSING' });
    const response = lmpsService.buildInquiryResponse({ result: 'OK', reference: body.reference, accountName: 'MFI ACCOUNT', accountCcy: 'LAK', originalMessage: body });
    await txn.update({ result: response.result, response_time: response.time, raw_response: JSON.stringify(response), status: 'SUCCESS' });
    res.json(response);
}));

router.post('/lmps/transfer', asyncHandler(async (req, res) => {
    const body = req.body, lapnetSig = req.headers['x-lapnet-request-signature'], sourceSig = req.headers['x-source-request-signature'], txnId = req.headers['x-lapnet-transaction-id'];
    const txn = await db.lmps_transactions.create({ direction: 'INCOMING', command_type: 'TRANSFER', lapnet_transaction_id: txnId, from_member: body.frommember, from_user: body.fromuser, from_user_fullname: body.fromuserfullname, from_account: body.fromaccount, from_account_type: body.fromaccounttype, to_type: body.totype, to_account: body.toaccount, to_member: body.tomember, reference: body.reference, amount: body.amount, fee: body.fee, ccy: body.ccy, purpose: body.purpose, request_time: body.time, source_signature: sourceSig, lapnet_request_signature: lapnetSig, raw_request: JSON.stringify(body), retry_count: body.retry || 0, status: 'PROCESSING' });
    const response = lmpsService.buildTransferResponse({ result: 'OK', shouldRevert: 0, reference: body.reference, originalMessage: body });
    await txn.update({ result: response.result, should_revert: response.shouldrevert, response_time: response.time, raw_response: JSON.stringify(response), status: 'SUCCESS' });
    res.json(response);
}));

router.post('/lmps/notify', asyncHandler(async (req, res) => {
    const body = req.body;
    await db.lmps_transactions.create({ direction: 'INCOMING', command_type: 'NOTIFY', lapnet_transaction_id: body.transactionid, reference: body.reference, result: body.result, request_time: body.time, raw_request: JSON.stringify(body), status: body.result === 'OK' ? 'SUCCESS' : 'FAILED' });
    res.json({ result: 'OK' });
}));

// ── Management ──
router.post('/lmps/generate-keys', requireAuth, asyncHandler(async (req, res) => {
    const { memberCode, keyName } = req.body;
    const { publicKey, privateKey } = lmpsService.generateKeyPair();
    await db.lmps_keys.create({ key_type: 'MEMBER_PRIVATE', key_name: keyName || `${memberCode || 'MFI'} Private Key`, key_data: privateKey, member_code: memberCode });
    await db.lmps_keys.create({ key_type: 'MEMBER_PUBLIC', key_name: keyName || `${memberCode || 'MFI'} Public Key`, key_data: publicKey, member_code: memberCode });
    res.json({ message: 'ສ້າງ RSA key pair ສຳເລັດ', publicKey, status: true });
}));

router.get('/lmps/keys', asyncHandler(async (_req, res) => {
    const keys = await db.lmps_keys.findAll({ order: [['created_at', 'DESC']] });
    res.json({ data: keys.map(k => { const d = k.toJSON(); if (d.key_type === 'MEMBER_PRIVATE') d.key_data = '***** HIDDEN *****'; return d; }), status: true });
}));

router.post('/lmps/generate-qr', requireAuth, asyncHandler(async (req, res) => {
    const { merchantId, merchantName, merchantCity, acquirerIIN, paymentType, amount, mcc, billNumber, purpose } = req.body;
    if (!merchantId || !merchantName || !acquirerIIN) return res.status(400).json({ message: 'ຕ້ອງມີ merchantId, merchantName, acquirerIIN', status: false });
    const qr = lmpsService.generateLaoQR({ merchantId, merchantName, merchantCity: merchantCity || 'VTE', acquirerIIN, paymentType: paymentType || '002', amount: amount || null, mcc: mcc || '5813', additionalData: { billNumber, purpose } });
    res.json({ qrString: qr, length: qr.length, status: true });
}));

router.get('/lmps/member-iins', (_req, res) => { res.json({ data: lmpsService.MEMBER_IIN, status: true }); });

router.get('/lmps/transactions', asyncHandler(async (req, res) => {
    const { direction, command_type, status, limit = 50, offset = 0 } = req.query;
    const where = {}; if (direction) where.direction = direction; if (command_type) where.command_type = command_type; if (status) where.status = status;
    const r = await db.lmps_transactions.findAndCountAll({ where, order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ data: r.rows, total: r.count, status: true });
}));

module.exports = router;
