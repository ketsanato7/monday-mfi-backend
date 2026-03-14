/**
 * auditLogger.js — Auto-log mutation requests (POST/PUT/DELETE)
 * Records: method, path, user, timestamp → audit_logs table
 */
const logger = require('../config/logger');
const db = require('../models');

function auditLogger(req, res, next) {
    // Only log mutations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next();

    // Skip health checks, login, audit itself
    const skip = ['/auth/login', '/audit/log', '/jdb/callback'];
    if (skip.some(s => req.path.includes(s))) return next();

    // Capture the original end to log after response
    const originalEnd = res.end;
    const startTime = Date.now();

    res.end = function (...args) {
        const duration = Date.now() - startTime;
        const userId = req.user?.id || null;
        const username = req.user?.email || req.user?.role || 'unknown';

        // Fire-and-forget audit log
        db.sequelize.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, details, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            {
                bind: [
                    userId,
                    req.method,
                    req.path,
                    JSON.stringify({
                        method: req.method,
                        path: req.originalUrl,
                        statusCode: res.statusCode,
                        duration: `${duration}ms`,
                        username,
                        ip: req.ip,
                    }),
                ],
            }
        ).catch(err => {
            // Silent fail — audit should not break the app
            if (!err.message.includes('relation "audit_logs" does not exist')) {
                logger.error('⚠️ Audit log error:', err.message);
            }
        });

        originalEnd.apply(res, args);
    };

    next();
}

module.exports = auditLogger;
