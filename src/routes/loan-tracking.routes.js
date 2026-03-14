/**
 * loan-tracking.routes.js — Thin Controller (5 endpoints)
 * ═══════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 499 ແຖວ (raw SQL + JE + NPL logic)
 * ✅ ຫຼັງ: ~35 ແຖວ
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const Service = require('../services/loanTracking.service');

router.post('/loan-tracking/pay', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), asyncHandler(async (req, res) => {
    res.json(await Service.pay(req.body));
}));

router.post('/loan-tracking/calculate-penalty', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), asyncHandler(async (_req, res) => {
    res.json(await Service.calculatePenalty());
}));

router.post('/loan-tracking/classify', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), asyncHandler(async (_req, res) => {
    res.json(await Service.classify());
}));

router.get('/loan-tracking/dashboard', asyncHandler(async (_req, res) => {
    res.json(await Service.dashboard());
}));

router.get('/loan-tracking/schedules/:contractId', asyncHandler(async (req, res) => {
    res.json(await Service.schedules(req.params.contractId));
}));

module.exports = router;
