/**
 * deposit_account.routes.js — Thin Controller (Refactored)
 * ═══════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 855 ແຖວ (logic + SQL + JE + error handling ທັງໝົດ)
 * ✅ ຫຼັງ: ~85 ແຖວ (thin controller → DepositAccountService)
 *
 * ທຸກ endpoint ເກົ່າ ຢູ່ຄົບ — ພຽງແຕ່ logic ຍ້າຍໄປ service
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const db = require('../models');
const DepositAccountService = require('../services/depositAccount.service');

const service = new DepositAccountService(db);

// GET /deposit_products
router.get('/deposit_products', asyncHandler(async (req, res) => {
    const data = await service.getProducts();
    res.json({ success: true, data });
}));

// GET /deposit-accounts
router.get('/deposit-accounts', asyncHandler(async (req, res) => {
    const data = await service.getAll();
    res.json({ success: true, data });
}));

// GET /deposit-accounts/:id
router.get('/deposit-accounts/:id', asyncHandler(async (req, res) => {
    const data = await service.getById(req.params.id);
    res.json({ success: true, data });
}));

// POST /deposit-accounts/open — BR-O1, BR-O3, BR-O4
router.post('/deposit-accounts/open', requirePermission('ສ້າງເງິນຝາກ'), asyncHandler(async (req, res) => {
    const result = await service.open(req.body, req.user?.id);
    res.json({ success: true, data: result, message: `ເປີດບັນຊີສຳເລັດ: ${result.account_no}` });
}));

// POST /deposit-accounts/:id/deposit — BR-D1, BR-D2, BR-D6
router.post('/deposit-accounts/:id/deposit', requirePermission('ສ້າງເງິນຝາກ'), asyncHandler(async (req, res) => {
    const result = await service.deposit(req.params.id, req.body.amount, req.user?.id, req.body.remarks);
    res.json({ success: true, data: result, message: result.message });
}));

// POST /deposit-accounts/:id/withdraw — BR-W1 to BR-W7
router.post('/deposit-accounts/:id/withdraw', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    const result = await service.withdraw(req.params.id, req.body.amount, req.user?.id, req.body.remarks);
    res.json({ success: true, data: result, message: result.message });
}));

// POST /deposit-accounts/:id/calculate-interest — BR-I1, BR-I2
router.post('/deposit-accounts/:id/calculate-interest', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    const result = await service.calculateAndPayInterest(req.params.id, req.user?.id);
    res.json({ success: true, data: result, message: result.message });
}));

// GET /deposit-accounts/:id/statement
router.get('/deposit-accounts/:id/statement', asyncHandler(async (req, res) => {
    const data = await service.getStatement(req.params.id);
    res.json({ success: true, data });
}));

// POST /deposit-accounts/:id/close — BR-C1, BR-C5
router.post('/deposit-accounts/:id/close', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    const result = await service.close(req.params.id);
    res.json({ success: true, ...result });
}));

module.exports = router;
