/**
 * jdb.routes.js — Thin Controller (8 endpoints)
 * ❌ ກ່ອນ: 505 ແຖວ → ✅ ຫຼັງ: ~30 ແຖວ
 */
const router = require('express').Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/jdbCallback.service');

router.post('/jdb/generate-qr', requirePermission('ເບີກຈ່າຍ'), asyncHandler(async (req, res) => { res.json(await S.generateQR(req.body)); }));
router.get('/jdb/check/:billNumber', asyncHandler(async (req, res) => { res.json(await S.check(req.params.billNumber)); }));
router.post('/jdb/check-ref', requirePermission('ເບີກຈ່າຍ'), asyncHandler(async (req, res) => { res.json(await S.checkRef(req.body)); }));
router.post('/jdb/disable-bill', requirePermission('ເບີກຈ່າຍ'), asyncHandler(async (req, res) => { res.json(await S.disableBill(req.body.billNumber)); }));
router.post('/jdb/refund', requirePermission('ເບີກຈ່າຍ'), asyncHandler(async (req, res) => { res.json(await S.refund(req.body)); }));
router.post('/jdb/callback', asyncHandler(async (req, res) => { res.json(await S.handleCallback(req.body, req.headers)); }));
router.post('/v1/jdb/subscription', asyncHandler(async (req, res) => { res.json(await S.handleCallback(req.body, req.headers)); }));
router.get('/jdb/test-connection', asyncHandler(async (_req, res) => { res.json(await S.testConnection()); }));

module.exports = router;
