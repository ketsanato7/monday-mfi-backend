/**
 * financial_reports.routes.js — Thin controller (was 269 → ~14)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const FinancialReportsService = require('../services/financialReports.service');

router.get('/financial-reports/f01', asyncHandler(async (req, res) => res.json(await FinancialReportsService.trialBalance(req.query.as_of_date))));
router.get('/financial-reports/f02', asyncHandler(async (req, res) => res.json(await FinancialReportsService.balanceSheet(req.query.as_of_date))));
router.get('/financial-reports/f03', asyncHandler(async (_req, res) => res.json(await FinancialReportsService.incomeStatement())));

module.exports = router;
