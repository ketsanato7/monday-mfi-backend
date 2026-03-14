/**
 * hr.routes.js — Thin Controller (13 endpoints)
 * ══════════════════════════════════════════════
 * ❌ ກ່ອນ: 671 ແຖວ
 * ✅ ຫຼັງ: ~65 ແຖວ
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { payrollCalculate, leaveRequest } = require('../middleware/zodSchemas');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/hr.service');

// ── Leave ──
router.post('/hr/leave-request', requireAuth, validate(leaveRequest), asyncHandler(async (req, res) => { res.json(await S.leaveRequest(req.body)); }));
router.put('/hr/leave-request/:id/approve', requireAuth, asyncHandler(async (req, res) => { res.json(await S.leaveApprove(req.params.id, req.user?.id)); }));
router.put('/hr/leave-request/:id/reject', requireAuth, asyncHandler(async (req, res) => { res.json(await S.leaveReject(req.params.id, req.body.reject_reason, req.user?.id)); }));
router.get('/hr/leave-balance/:employeeId', asyncHandler(async (req, res) => { res.json(await S.leaveBalance(req.params.employeeId, req.query.year)); }));
router.post('/hr/leave-balance/init', requireAuth, asyncHandler(async (req, res) => { res.json(await S.initLeaveBalance(req.body.year)); }));

// ── OT ──
router.post('/hr/overtime', requireAuth, asyncHandler(async (req, res) => { res.json(await S.overtimeRecord(req.body)); }));
router.put('/hr/overtime/:id/approve', requireAuth, asyncHandler(async (req, res) => { res.json(await S.overtimeApprove(req.params.id, req.user?.id)); }));

// ── Payroll ──
router.post('/hr/payroll/calculate', requireAuth, validate(payrollCalculate), asyncHandler(async (req, res) => { res.json(await S.payrollCalculate(req.body)); }));
router.get('/hr/payroll/slip/:payrollId', asyncHandler(async (req, res) => { res.json(await S.payrollSlip(req.params.payrollId)); }));
router.post('/hr/payroll/finalize', requireAuth, asyncHandler(async (req, res) => { res.json(await S.payrollFinalize(req.body)); }));
router.get('/hr/payroll/report', asyncHandler(async (req, res) => { res.json(await S.payrollReport(req.query.month)); }));

// ── Employee ──
router.put('/hr/employee/:id/resign', requireAuth, asyncHandler(async (req, res) => { res.json(await S.resign(req.params.id, req.body)); }));
router.get('/hr/employee/:id/certificate', asyncHandler(async (req, res) => { res.json(await S.certificate(req.params.id)); }));

// ── Dashboard ──
router.get('/hr/dashboard', asyncHandler(async (_req, res) => { res.json(await S.dashboard()); }));

module.exports = router;
