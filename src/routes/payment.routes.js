/**
 * payment.routes.js — Thin controller (was 188 → ~14)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const { requirePermission } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { loanPayment } = require('../middleware/zodSchemas');
const PaymentService = require('../services/payment.service');

router.post('/loan-payment', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), validate(loanPayment), asyncHandler(async (req, res) => res.json(await PaymentService.loanPayment(req.body))));
router.get('/repayment-schedules/:loan_id', asyncHandler(async (req, res) => res.json(await PaymentService.repaymentSchedules(req.params.loan_id))));

module.exports = router;
