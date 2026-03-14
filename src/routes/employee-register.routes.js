/**
 * employee-register.routes.js — Thin Controller (3 endpoints)
 * ═══════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 354 ແຖວ
 * ✅ ຫຼັງ: ~20 ແຖວ
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/employeeRegister.service');

router.post('/hr/employees/register-full', asyncHandler(async (req, res) => { res.json(await S.registerFull(req.body)); }));
router.get('/hr/employees/:id/full', asyncHandler(async (req, res) => { res.json(await S.getFull(req.params.id)); }));
router.put('/hr/employees/:id/update-full', asyncHandler(async (req, res) => { res.json(await S.updateFull(req.params.id, req.body)); }));

module.exports = router;
