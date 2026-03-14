/**
 * general_ledger.routes.js — Thin controller (was 224 → ~12)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const GeneralLedgerService = require('../services/generalLedger.service');

router.get('/general-ledger', asyncHandler(async (req, res) => res.json(await GeneralLedgerService.ledger(req.query))));
router.get('/general-ledger/accounts', asyncHandler(async (_req, res) => res.json(await GeneralLedgerService.accounts())));

module.exports = router;
