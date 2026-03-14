/**
 * credit_reports.routes.js — Thin controller (was 292 → ~20)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const CreditReportsService = require('../services/creditReports.service');

router.get('/credit-reports/f04', asyncHandler(async (_req, res) => res.json(await CreditReportsService.regular())));
router.get('/credit-reports/f05', asyncHandler(async (_req, res) => res.json(await CreditReportsService.restructuring())));
router.get('/credit-reports/f06', asyncHandler(async (_req, res) => res.json(await CreditReportsService.transferred())));
router.get('/credit-reports/f07', asyncHandler(async (_req, res) => res.json(await CreditReportsService.relatedParty())));
router.get('/credit-reports/f08', asyncHandler(async (_req, res) => res.json(await CreditReportsService.largeCustomer())));
router.get('/credit-reports/f09', asyncHandler(async (_req, res) => res.json(await CreditReportsService.interestRate())));

module.exports = router;
