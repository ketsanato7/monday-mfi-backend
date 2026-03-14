/**
 * workflow.routes.js — Workflow & Approval API
 *
 * POST /api/workflow/transition   → ดำเนิน transition
 * GET  /api/workflow/actions/:entity/:id → ดึง available actions
 * GET  /api/workflow/history/:entity/:id → ดึง approval history
 * 
 * Approval Config Management:
 * GET    /api/approval-configs          → ລາຍການ configs
 * POST   /api/approval-configs          → ສ້າງ config ໃໝ່
 * PUT    /api/approval-configs/:id       → ແກ້ໄຂ config
 * DELETE /api/approval-configs/:id       → ລຶບ config
 */
const logger = require('../config/logger');
const express = require('express');
const router = express.Router();
const db = require('../models');
const seq = db.sequelize;
const { requireAuth, requirePermission } = require('../middleware/rbac');
const {
    executeTransition,
    getAvailableActions,
    STATES,
} = require('../engines/workflowEngine');

// ===== WORKFLOW TRANSITION =====
router.post('/workflow/transition', requirePermission('ອະນຸມັດສິນເຊື່ອ'), async (req, res) => {
    try {
        const { entityType, entityId, targetState, reason, amount } = req.body;
        const userId = req.body.userId || 1; // TODO: ຈາກ auth middleware

        if (!entityType || !entityId || !targetState) {
            return res.status(400).json({
                message: 'ຕ້ອງລະບຸ entityType, entityId, ແລະ targetState',
                status: false,
            });
        }

        const result = await executeTransition({
            entityType, entityId, targetState, userId, reason, amount,
        });

        res.json({ ...result, status: true });
    } catch (error) {
        logger.error('❌ Workflow error:', error.message);
        res.status(400).json({ message: error.message, status: false });
    }
});

// ===== GET AVAILABLE ACTIONS =====
router.get('/workflow/actions/:entity/:id', async (req, res) => {
    try {
        const { entity, id } = req.params;
        const Model = db[entity];
        if (!Model) return res.status(404).json({ message: `Model '${entity}' not found` });

        const record = await Model.findByPk(id);
        if (!record) return res.status(404).json({ message: 'Record not found' });

        const actions = getAvailableActions(record.status || 'DRAFT');
        res.json({ data: actions, currentState: record.status, status: true });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// ===== APPROVAL HISTORY =====
router.get('/workflow/history/:entity/:id', async (req, res) => {
    try {
        const { entity, id } = req.params;
        const ApprovalHistory = db['approval_histories'];
        if (!ApprovalHistory) return res.json({ data: [] });

        const history = await ApprovalHistory.findAll({
            where: { entity_type: entity, entity_id: id },
            order: [['id', 'DESC']],
        });
        res.json({ data: history, status: true });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// ===== WORKFLOW STATES (for reference) =====
router.get('/workflow/states', (req, res) => {
    res.json({ data: STATES, status: true });
});

// ===== NOTIFICATIONS =====
router.get('/notifications', async (req, res) => {
    try {
        const Notification = db['notifications'];
        if (!Notification) return res.json({ data: [] });

        const userId = req.query.userId || 1;
        const notifications = await Notification.findAll({
            order: [['id', 'DESC']],
            limit: 50,
        });
        res.json({ data: notifications, status: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        const Notification = db['notifications'];
        if (!Notification) return res.status(404).json({ message: 'Not found' });

        await Notification.update({ is_read: true }, { where: { id: req.params.id } });
        res.json({ message: 'ອ່ານແລ້ວ', status: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
