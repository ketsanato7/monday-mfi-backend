/**
 * journal_entry.routes.js — Thin Controller (6 endpoints)
 * ═══════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 343 ແຖວ
 * ✅ ຫຼັງ: ~30 ແຖວ
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/journalEntry.service');

router.get('/journal-entries', asyncHandler(async (req, res) => { res.json(await S.list(req.query)); }));
router.get('/journal-entries/:id', asyncHandler(async (req, res) => { res.json(await S.getById(req.params.id)); }));
router.post('/journal-entries', requirePermission('ແກ້ໄຂບັນຊີ'), asyncHandler(async (req, res) => { res.status(201).json(await S.create(req.body)); }));
router.put('/journal-entries/:id', requirePermission('ແກ້ໄຂບັນຊີ'), asyncHandler(async (req, res) => { res.json(await S.update(req.params.id, req.body)); }));
router.patch('/journal-entries/:id/post', asyncHandler(async (req, res) => { res.json(await S.post(req.params.id)); }));
router.delete('/journal-entries/:id', requirePermission('ແກ້ໄຂບັນຊີ'), asyncHandler(async (req, res) => { res.json(await S.remove(req.params.id)); }));

module.exports = router;
