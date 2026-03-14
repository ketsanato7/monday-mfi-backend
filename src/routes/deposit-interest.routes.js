/**
 * deposit-interest.routes.js — Thin Controller (4 endpoints)
 * ══════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 510 ແຖວ (raw SQL + COA mapping + JE creation)
 * ✅ ຫຼັງ: ~30 ແຖວ
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const Service = require('../services/depositInterest.service');

router.get('/deposit-interest/summary', asyncHandler(async (_req, res) => {
    res.json(await Service.summary());
}));

router.post('/deposit-interest/accrue', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.accrue(req.body.date));
}));

router.post('/deposit-interest/pay-monthly', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.payMonthly(req.body.date));
}));

router.post('/deposit-interest/mature', requirePermission('ແກ້ໄຂເງິນຝາກ'), asyncHandler(async (req, res) => {
    res.json(await Service.mature(req.body.date));
}));

module.exports = router;
