/**
 * loan_journal.routes.js — Thin Controller (3 endpoints)
 * ❌ ກ່ອນ: 306 ແຖວ → ✅ ຫຼັງ: ~15 ແຖວ
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/loanJournal.service');

router.get('/loan-journal/ledger', asyncHandler(async (req, res) => { res.json(await S.ledger(req.query)); }));
router.get('/loan-journal/summary', asyncHandler(async (req, res) => { res.json(await S.summary(req.query)); }));
router.get('/loan-journal/accounts', asyncHandler(async (_req, res) => { res.json(await S.accounts()); }));

module.exports = router;
