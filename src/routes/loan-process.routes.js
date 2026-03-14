/**
 * loan-process.routes.js — Thin Controller for Loan Lifecycle
 * 
 * ທຸກ business logic ຢູ່ໃນ LoanProcessService
 * Routes ເປັນ thin controller ເທົ່ານັ້ນ: validate → service → response
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { disburseLoan, loanRepayment } = require('../middleware/zodSchemas');
const LoanProcessService = require('../services/loanProcess.service');
const jdbService = require('../services/jdb.service');

// ── Helper: send service error ──
function sendError(res, err) {
    const status = err.statusCode || 500;
    res.status(status).json({ status: false, message: err.message, code: err.code });
}

// ═══════════════════════════════════════════
// POST /api/loan-process — ບັນທຶກ ທັງໝົດ
// ═══════════════════════════════════════════
router.post('/loan-process', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const result = await LoanProcessService.processOrigination(req.body);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// GET /api/loan-process/pending
router.get('/loan-process/pending', async (_req, res) => {
    try {
        const rows = await LoanProcessService.getPending();
        res.json(rows);
    } catch (err) { sendError(res, err); }
});

// PUT /api/loan-process/:id/approve
router.put('/loan-process/:id/approve', requirePermission('ອະນຸມັດສິນເຊື່ອ'), async (req, res) => {
    try {
        const result = await LoanProcessService.approve(req.params.id, req.user);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// PUT /api/loan-process/:id/reject
router.put('/loan-process/:id/reject', requirePermission('ອະນຸມັດສິນເຊື່ອ'), async (req, res) => {
    try {
        const result = await LoanProcessService.reject(req.params.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// GET /api/loan-process/pipeline
router.get('/loan-process/pipeline', async (_req, res) => {
    try {
        const result = await LoanProcessService.getPipeline();
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// GET /api/loan-process/dashboard
router.get('/loan-process/dashboard', async (_req, res) => {
    try {
        const result = await LoanProcessService.getDashboard();
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// POST /api/loan-process/auto-classify
router.post('/loan-process/auto-classify', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const result = await LoanProcessService.autoClassify(req.user?.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// GET /api/loan-process/jdb-config
router.get('/loan-process/jdb-config', async (_req, res) => {
    try {
        const result = await LoanProcessService.getJdbConfig();
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// PUT /api/loan-process/:id/submit
router.put('/loan-process/:id/submit', requireAuth, async (req, res) => {
    try {
        const result = await LoanProcessService.submit(req.params.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// POST /api/loan-process/create-application
router.post('/loan-process/create-application', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const result = await LoanProcessService.createApplication(req.body);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// PUT /api/loan-process/:id — ອັບເດດ ສັນຍາ ເດີມ
router.put('/loan-process/:id', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const result = await LoanProcessService.updateLoan(req.params.id, req.body);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// GET /api/loan-process/:id — ໂຫຼດ ສັນຍາ ເດີມ
router.get('/loan-process/:id', async (req, res) => {
    try {
        const result = await LoanProcessService.getLoanById(req.params.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// PUT /api/loan-process/:id/disburse
router.put('/loan-process/:id/disburse', requirePermission('ເບີກຈ່າຍ'), validate(disburseLoan), async (req, res) => {
    try {
        const result = await LoanProcessService.disburse(req.params.id, req.body, req.user?.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// PUT /api/loan-process/:id/disburse-confirm
router.put('/loan-process/:id/disburse-confirm', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const result = await LoanProcessService.disburseConfirm(req.params.id, req.body.billNumber, req.user?.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// GET /api/loan-process/:id/check-qr/:billNumber
router.get('/loan-process/:id/check-qr/:billNumber', async (req, res) => {
    try {
        const result = await jdbService.checkTransaction(req.params.billNumber);
        const isPaid = result.success && result.data?.message === 'SUCCESS';
        res.json({ status: true, paid: isPaid, data: result.data || null });
    } catch (err) {
        res.json({ status: true, paid: false, message: err.message });
    }
});

// GET /api/loan-process/:id/schedule
router.get('/loan-process/:id/schedule', async (req, res) => {
    try {
        const result = await LoanProcessService.getSchedule(req.params.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// POST /api/loan-process/:id/generate-schedule
router.post('/loan-process/:id/generate-schedule', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const result = await LoanProcessService.generateSchedule(req.params.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// POST /api/loan-process/:id/repay
router.post('/loan-process/:id/repay', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const result = await LoanProcessService.repay(req.params.id, req.body, req.user?.id);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

// POST /api/loan-process/:id/repay-qr
router.post('/loan-process/:id/repay-qr', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const result = await LoanProcessService.repayQR(req.params.id, req.body);
        res.json(result);
    } catch (err) { sendError(res, err); }
});

module.exports = router;
