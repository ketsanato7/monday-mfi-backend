/**
 * document-print.routes.js — Thin Controller (6 endpoints)
 * ════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 374 ແຖວ
 * ✅ ຫຼັງ: ~30 ແຖວ
 */
const router = require('express').Router();
const { requireAuth } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/documentPrint.service');

router.get('/document/loan-application/:loanId', requireAuth, asyncHandler(async (req, res) => { res.send(await S.loanApplication(req.params.loanId)); }));
router.get('/document/customer-form/:personId', requireAuth, asyncHandler(async (req, res) => { res.send(await S.customerForm(req.params.personId)); }));
router.get('/document/checklist/:loanId', requireAuth, asyncHandler(async (req, res) => { res.send(await S.checklist(req.params.loanId)); }));
router.get('/document/loan-contract/:loanId', requireAuth, asyncHandler(async (req, res) => { res.send(await S.loanContract(req.params.loanId)); }));
router.get('/document/receipt/:loanId/:scheduleId', requireAuth, asyncHandler(async (req, res) => { res.send(await S.receipt(req.params.loanId, req.params.scheduleId)); }));
router.get('/document/debt-notice/:loanId', requireAuth, asyncHandler(async (req, res) => { res.send(await S.debtNotice(req.params.loanId)); }));

module.exports = router;
