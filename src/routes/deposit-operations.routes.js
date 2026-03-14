/**
 * deposit-operations.routes.js — Ultra-Thin Controller (12 endpoints → asyncHandler)
 * ══════════════════════════════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 115 ແຖວ + 12 try/catch
 * ✅ ຫຼັງ: ~60 ແຖວ, 0 try/catch
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const Service = require('../services/depositOperations.service');

router.post('/deposit-operations/deposit', requirePermission('ສ້າງເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.deposit(req.body));
}));

router.post('/deposit-operations/withdraw', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.withdraw(req.body));
}));

router.post('/deposit-operations/close', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.close(req.body));
}));

router.post('/deposit-operations/transfer', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.transfer(req.body));
}));

router.post('/deposit-operations/freeze', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.freeze(req.body, req.user?.id || 1, req.tenantOrgId));
}));

router.post('/deposit-operations/unfreeze', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.unfreeze(req.body, req.user?.id || 1, req.tenantOrgId));
}));

router.get('/deposit-operations/exchange-rate', asyncHandler(async (req, res) => {
    res.json(await Service.getExchangeRate(req.query.from, req.query.to));
}));

router.post('/deposit-operations/exchange', requirePermission('ສ້າງເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.exchange(req.body, req.user?.id, req.tenantOrgId));
}));

router.get('/deposit-operations/transactions', asyncHandler(async (_req, res) => {
    res.json(await Service.getTransactions());
}));

router.get('/deposit-operations/accounts', asyncHandler(async (_req, res) => {
    res.json(await Service.getAccounts());
}));

router.get('/deposit-operations/freeze-history/:accountId', asyncHandler(async (req, res) => {
    res.json(await Service.getFreezeHistory(req.params.accountId));
}));

router.get('/deposit-operations/exchange-history', asyncHandler(async (_req, res) => {
    res.json(await Service.getExchangeHistory());
}));

module.exports = router;
