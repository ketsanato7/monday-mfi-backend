/**
 * admin.routes.js — Thin Controller (12 endpoints)
 * ═════════════════════════════════════════════════
 * ❌ ກ່ອນ: 315 ແຖວ
 * ✅ ຫຼັງ: ~45 ແຖວ
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/admin.service');

// ── Institutions ──
router.get('/admin/institutions', asyncHandler(async (_req, res) => { res.json(await S.getInstitutions()); }));
router.post('/admin/institutions', requirePermission('ຈັດການຜູ້ໃຊ້'), asyncHandler(async (req, res) => { res.json(await S.createInstitution(req.body)); }));
router.delete('/admin/institutions/:code', requirePermission('ຈັດການຜູ້ໃຊ້'), asyncHandler(async (req, res) => { res.json(await S.deleteInstitution(req.params.code)); }));

// ── Roles & Permissions ──
router.get('/admin/roles', asyncHandler(async (_req, res) => { res.json(await S.getRoles()); }));
router.get('/admin/role-permissions/:roleId', asyncHandler(async (req, res) => { res.json(await S.getRolePermissions(req.params.roleId)); }));
router.put('/admin/role-permissions/:roleId', requirePermission('ຈັດການບົດບາດ'), asyncHandler(async (req, res) => { res.json(await S.updateRolePermissions(req.params.roleId, req.body.permission_ids)); }));

// ── Menus ──
router.get('/admin/menu-items', asyncHandler(async (_req, res) => { res.json(await S.getMenuItems()); }));
router.post('/admin/menu-items/seed', requireAuth, asyncHandler(async (req, res) => { res.json(await S.seedMenuItems(req.body.items)); }));
router.get('/admin/role-menus/:roleId', asyncHandler(async (req, res) => { res.json(await S.getRoleMenus(req.params.roleId)); }));
router.put('/admin/role-menus/:roleId', requirePermission('ຈັດການບົດບາດ'), asyncHandler(async (req, res) => { res.json(await S.updateRoleMenus(req.params.roleId, req.body.menu_ids)); }));
router.get('/admin/my-menus/:roleId', asyncHandler(async (req, res) => { res.json(await S.getMyMenus(req.params.roleId)); }));

// ── Permissions ──
router.get('/admin/permissions', asyncHandler(async (_req, res) => { res.json(await S.getPermissions()); }));
router.post('/admin/permissions/seed', requireAuth, asyncHandler(async (_req, res) => { res.json(await S.seedPermissions()); }));

module.exports = router;
