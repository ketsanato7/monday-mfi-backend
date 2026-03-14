/**
 * loan-reports.routes.js — Thin Controller (6 endpoints)
 * ❌ ກ່ອນ: 372 ແຖວ → ✅ ຫຼັງ: ~25 ແຖວ
 */
const router = require('express').Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/loanReports.service');

router.post('/loan-reports/ecl-calculate', requirePermission('ສົ່ງອອກລາຍງານ'), asyncHandler(async (_req, res) => { res.json(await S.eclCalculate()); }));
router.get('/loan-reports/ecl-staging', asyncHandler(async (_req, res) => { res.json(await S.eclStaging()); }));
router.post('/loan-reports/close-period', requirePermission('ແກ້ໄຂບັນຊີ'), asyncHandler(async (req, res) => { res.json(await S.closePeriod(req.body.periodId)); }));
router.get('/loan-reports/trial-balance/:periodId', asyncHandler(async (req, res) => { res.json(await S.trialBalance(req.params.periodId)); }));
router.get('/loan-reports/collection', asyncHandler(async (_req, res) => { res.json(await S.collection()); }));
router.get('/loan-reports/portfolio', asyncHandler(async (_req, res) => { res.json(await S.portfolio()); }));

module.exports = router;
