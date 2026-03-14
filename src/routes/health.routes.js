/**
 * Health Check Route (Phase 15 — Observability)
 * ═══════════════════════════════════════════════
 * K8s readiness + liveness probes
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const cache = require('../config/cache');

// GET /api/health — Liveness probe
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
    });
});

// GET /api/health/ready — Readiness probe (including DB + cache)
router.get('/health/ready', async (req, res) => {
    const checks = {
        database: false,
        cache: false,
        memory: false,
    };

    // DB check
    try {
        await db.sequelize.authenticate();
        checks.database = true;
    } catch {
        checks.database = false;
    }

    // Cache check
    checks.cache = cache.isAvailable();

    // Memory check (< 1GB)
    const memUsage = process.memoryUsage();
    checks.memory = memUsage.heapUsed < 1024 * 1024 * 1024;

    const allHealthy = checks.database && checks.memory;
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: allHealthy ? 'ready' : 'not ready',
        checks,
        memory: {
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(0)}MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(0)}MB`,
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(0)}MB`,
        },
        uptime: `${Math.floor(process.uptime())}s`,
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
