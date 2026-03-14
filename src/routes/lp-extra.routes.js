/**
 * lp-extra.routes.js — Thin controller (was 218 → ~18)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const { requirePermission } = require('../middleware/rbac');
const LpExtraService = require('../services/lpExtra.service');

router.post('/group-register', requirePermission('ສ້າງສິນເຊື່ອ'), asyncHandler(async (req, res) => res.json(await LpExtraService.createGroup(req.body))));
router.get('/group-register', asyncHandler(async (_req, res) => res.json(await LpExtraService.listGroups())));
router.post('/loan-process/blacklist-check', requirePermission('ເບິ່ງສິນເຊື່ອ'), asyncHandler(async (req, res) => res.json(await LpExtraService.blacklistCheck(req.body))));
router.post('/customer-blacklist', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), asyncHandler(async (req, res) => res.json(await LpExtraService.addBlacklist(req.body))));
router.get('/iif/headers', asyncHandler(async (_req, res) => res.json(await LpExtraService.listIifHeaders())));
router.post('/iif/import', requirePermission('ສ້າງສິນເຊື່ອ'), asyncHandler(async (req, res) => res.json(await LpExtraService.importIif(req.body))));

module.exports = router;
