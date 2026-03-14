/**
 * Approval Routes — Maker-Checker Workflow
 * BoL Decree 184 Compliance
 */
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const approvalService = require('../services/approval.service');
const db = require('../models');

// GET /api/approvals — List all (filter by status, entity_type)
router.get('/approvals', async (req, res) => {
    try {
        const { status, entity_type, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (entity_type) where.entity_type = entity_type;
        if (req.user?.org_id) where.tenant_id = req.user.org_id;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await db.approval_workflows.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            success: true,
            data: rows,
            pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
        });
    } catch (err) {
        logger.error('Approvals list failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load approvals' });
    }
});

// GET /api/approvals/pending — Checker dashboard
router.get('/approvals/pending', async (req, res) => {
    try {
        const pending = await approvalService.getPending(db, req.user?.org_id);
        res.json({ success: true, data: pending });
    } catch (err) {
        logger.error('Pending approvals failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load pending approvals' });
    }
});

// GET /api/approvals/history/:entityType/:entityId — Approval history
router.get('/approvals/history/:entityType/:entityId', async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const history = await approvalService.getHistory(entityType, entityId, db);
        res.json({ success: true, data: history });
    } catch (err) {
        logger.error('Approval history failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load approval history' });
    }
});

// POST /api/approvals/:id/approve — Approve (Checker)
router.post('/approvals/:id/approve', async (req, res) => {
    try {
        const approval = await approvalService.approve(
            req.params.id, req.user?.id, db, req.body.notes
        );
        res.json({ success: true, data: approval, message: 'Approved successfully' });
    } catch (err) {
        logger.error('Approve failed', { error: err.message, id: req.params.id });
        res.status(400).json({ success: false, message: err.message });
    }
});

// POST /api/approvals/:id/reject — Reject (Checker)
router.post('/approvals/:id/reject', async (req, res) => {
    try {
        const approval = await approvalService.reject(
            req.params.id, req.user?.id, db, req.body.reason
        );
        res.json({ success: true, data: approval, message: 'Rejected' });
    } catch (err) {
        logger.error('Reject failed', { error: err.message, id: req.params.id });
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
