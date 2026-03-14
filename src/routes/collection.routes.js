/**
 * collection.routes.js — Thin controller (was 231 → ~15)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/rbac');
const CollectionService = require('../services/collection.service');

router.post('/calculate-dpd', requireAuth, asyncHandler(async (_req, res) => res.json(await CollectionService.calculateDPD())));
router.get('/dashboard-stats', asyncHandler(async (_req, res) => res.json(await CollectionService.dashboardStats())));
router.get('/overdue-contracts', asyncHandler(async (req, res) => res.json(await CollectionService.overdueContracts(req.query.bucket))));
router.get('/officer-stats', asyncHandler(async (_req, res) => res.json(await CollectionService.officerStats())));

module.exports = router;
