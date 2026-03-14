/**
 * accounting.engine.routes.js — Thin Controller (7 endpoints)
 * ═══════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 262 ແຖວ
 * ✅ ຫຼັງ: ~35 ແຖວ
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/accountingEngine.service');

// ── Financial Statements ──
router.post('/accounting/generate-fs', requirePermission('ແກ້ໄຂບັນຊີ'), asyncHandler(async (req, res) => { res.json(await S.generateFS(req.body)); }));
router.get('/accounting/financial-statements', asyncHandler(async (_req, res) => { res.json(await S.listFS()); }));
router.get('/accounting/financial-statements/:id/lines', asyncHandler(async (req, res) => { res.json(await S.getFSLines(req.params.id)); }));

// ── Loan Approval Limits ──
router.get('/loan-approval/limits', asyncHandler(async (_req, res) => { res.json(await S.getLoanLimits()); }));
router.post('/loan-approval/check', requirePermission('ອະນຸມັດສິນເຊື່ອ'), asyncHandler(async (req, res) => { res.json(await S.checkLoanLimit(req.body)); }));

// ── Audit Log ──
router.post('/audit/log', requirePermission('ແກ້ໄຂບັນຊີ'), asyncHandler(async (req, res) => { res.json(await S.createAuditLog(req.body)); }));
router.get('/audit/logs', asyncHandler(async (req, res) => { res.json(await S.getAuditLogs(req.query)); }));

module.exports = router;
