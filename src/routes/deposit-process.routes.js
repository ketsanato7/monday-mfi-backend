/**
 * deposit-process.routes.js — Thin Controller (3 endpoints)
 * ❌ ກ່ອນ: 324 ແຖວ → ✅ ຫຼັງ: ~15 ແຖວ
 */
const router = require('express').Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/depositProcess.service');

router.get('/deposit-process/products', asyncHandler(async (_req, res) => { res.json(await S.getProducts()); }));
router.get('/deposit-process/accounts', asyncHandler(async (_req, res) => { res.json(await S.getAccounts()); }));
router.post('/deposit-process', requirePermission('ສ້າງເງິນຝາກ'), asyncHandler(async (req, res) => { res.json(await S.openAccount(req.body)); }));

module.exports = router;
