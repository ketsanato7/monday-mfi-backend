/**
 * CTR Routes — Currency Transaction Report Management
 * AML/CFT Article 20 Compliance
 * ════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const ctrService = require('../services/ctr.service');
const db = require('../models');

// GET /api/ctr — List all CTR reports
router.get('/', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (req.user?.org_id) where.tenant_id = req.user.org_id;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await db.ctr_reports.findAndCountAll({
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
        logger.error('CTR list failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load CTR reports' });
    }
});

// GET /api/ctr/stats — Dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await ctrService.getStats(db, req.user?.org_id);
        res.json({ success: true, data: stats });
    } catch (err) {
        logger.error('CTR stats failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load CTR stats' });
    }
});

// GET /api/ctr/:id — Get single CTR
router.get('/:id', async (req, res) => {
    try {
        const ctr = await db.ctr_reports.findByPk(req.params.id);
        if (!ctr) return res.status(404).json({ success: false, message: 'CTR not found' });
        res.json({ success: true, data: ctr });
    } catch (err) {
        logger.error('CTR get failed', { error: err.message, id: req.params.id });
        res.status(500).json({ success: false, message: 'Failed to load CTR' });
    }
});

// POST /api/ctr/:id/submit — Submit CTR to AMLIO
router.post('/:id/submit', async (req, res) => {
    try {
        const ctr = await ctrService.submitToAmlio(req.params.id, req.user?.id, db);
        res.json({ success: true, data: ctr, message: 'CTR submitted to AMLIO' });
    } catch (err) {
        logger.error('CTR submit failed', { error: err.message, id: req.params.id });
        res.status(400).json({ success: false, message: err.message });
    }
});

// POST /api/ctr/manual — Manual CTR creation (for non-automated cases)
router.post('/manual', async (req, res) => {
    try {
        const ctr = await ctrService.checkAndReport({
            ...req.body,
            transaction_type: req.body.transaction_type || 'manual',
        }, req.user, db);

        if (!ctr) {
            return res.status(400).json({ success: false, message: 'Amount below CTR threshold' });
        }

        res.status(201).json({ success: true, data: ctr, message: 'CTR report created' });
    } catch (err) {
        logger.error('CTR manual create failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to create CTR' });
    }
});

module.exports = router;
