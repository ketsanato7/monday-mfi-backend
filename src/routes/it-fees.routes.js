/**
 * it-fees.routes.js — Thin controller (was 212 → ~18)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { itFeeCharge } = require('../middleware/zodSchemas');
const ItFeesService = require('../services/itFees.service');

router.get('/it-fees/configs', asyncHandler(async (_req, res) => res.json(await ItFeesService.getConfigs())));
router.put('/it-fees/configs/:id', requireAuth, asyncHandler(async (req, res) => res.json(await ItFeesService.updateConfig(req.params.id, req.body))));
router.post('/it-fees/charge', requireAuth, validate(itFeeCharge), asyncHandler(async (req, res) => res.json(await ItFeesService.charge(req.body, req.user?.id || null))));
router.get('/it-fees/history', asyncHandler(async (req, res) => res.json(await ItFeesService.history(req.query))));
router.get('/it-fees/summary', asyncHandler(async (req, res) => res.json(await ItFeesService.summary(req.query.period))));

module.exports = router;
