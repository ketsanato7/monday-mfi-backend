/**
 * loan-lifecycle.routes.js — Thin Controller (Refactored)
 * ═══════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 401 ແຖວ (raw SQL + try/catch ຊ້ຳ)
 * ✅ ຫຼັງ: ~45 ແຖວ (thin controller → LoanLifecycleService)
 *
 * ທຸກ endpoint ເກົ່າ ຢູ່ຄົບ:
 *   Q1: POST /loan-lifecycle/disburse
 *   Q5: POST /loan-lifecycle/restructure
 *   Q6: POST /loan-lifecycle/write-off
 *   Q7: POST /loan-lifecycle/extend
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const db = require('../models');
const LoanLifecycleService = require('../services/loanLifecycle.service');

const service = new LoanLifecycleService(db);

// Q1: ເບີກຈ່າຍ
router.post('/loan-lifecycle/disburse', requirePermission('ເບີກຈ່າຍ'), asyncHandler(async (req, res) => {
    const result = await service.disburse(req.body.contractId, req.user?.id);
    res.json({ status: true, data: result, message: result.message });
}));

// Q5: ປັບໂຄງສ້າງ
router.post('/loan-lifecycle/restructure', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), asyncHandler(async (req, res) => {
    const { contractId, newTermMonths, newInterestRate } = req.body;
    const result = await service.restructure(contractId, newTermMonths, newInterestRate, req.user?.id);
    res.json({ status: true, data: result, message: result.message });
}));

// Q6: ຕັດໜີ້ສູນ
router.post('/loan-lifecycle/write-off', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), asyncHandler(async (req, res) => {
    const result = await service.writeOff(req.body.contractId, req.user?.id);
    res.json({ status: true, data: result, message: result.message });
}));

// Q7: ຂະຫຍາຍ
router.post('/loan-lifecycle/extend', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), asyncHandler(async (req, res) => {
    const { contractId, extraMonths } = req.body;
    const result = await service.extend(contractId, extraMonths, req.user?.id);
    res.json({ status: true, data: result, message: result.message });
}));

module.exports = router;
