/**
 * loan_disbursement.routes.js — Thin controller (was 260 → ~17)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const { requirePermission } = require('../middleware/rbac');
const LoanDisbursementService = require('../services/loanDisbursement.service');

router.get('/loan-disbursement/cash-balance', asyncHandler(async (_req, res) => res.json(await LoanDisbursementService.cashBalance())));
router.get('/loan-disbursement/pending', asyncHandler(async (_req, res) => res.json(await LoanDisbursementService.pending())));
router.post('/loan-disbursement/disburse/:id', requirePermission('ເບີກຈ່າຍ'), asyncHandler(async (req, res) => res.json(await LoanDisbursementService.disburse(req.params.id, req.body))));
router.get('/loan-disbursement/history', asyncHandler(async (req, res) => res.json(await LoanDisbursementService.history(req.query))));

module.exports = router;
