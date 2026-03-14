/**
 * Enterprise Structured Logger — Winston
 * ═══════════════════════════════════════
 * AML/CFT Compliance: structured JSON logs, no PII
 * 
 * Usage:
 *   const logger = require('./config/logger');
 *   logger.info('Loan approved', { loanId: 123, userId: req.user.id });
 *   logger.error('DB query failed', { error: err.message, route: '/api/loans' });
 */
const winston = require('winston');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

// ── PII Filter: ❌ ຫ້າມ log passwords, tokens, PII ──
const piiFilter = winston.format((info) => {
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'creditCard'];
    if (typeof info.message === 'object') {
        for (const key of sensitiveKeys) {
            if (info.message[key]) info.message[key] = '***REDACTED***';
        }
    }
    if (info.meta && typeof info.meta === 'object') {
        for (const key of sensitiveKeys) {
            if (info.meta[key]) info.meta[key] = '***REDACTED***';
        }
    }
    return info;
});

// ── Transports ──
const transports = [
    // Console: always on (colorized in dev, JSON in prod)
    new winston.transports.Console({
        format: isProduction
            ? winston.format.combine(winston.format.timestamp(), winston.format.json())
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} ${level}: ${message}${metaStr}`;
                })
            ),
    }),
];

// Production: add file transports with rotation
if (isProduction) {
    transports.push(
        // Combined log (info+)
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 30,
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        // Error log
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 90, // 3 months
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
        // Audit log (≥5 years for BoL compliance)
        new winston.transports.File({
            filename: path.join('logs', 'audit.log'),
            maxsize: 50 * 1024 * 1024,
            maxFiles: 365 * 5, // 5 years
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
    );
}

const logger = winston.createLogger({
    level: isProduction ? 'info' : 'debug',
    format: winston.format.combine(
        piiFilter(),
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'monday-mfi-backend',
        environment: process.env.NODE_ENV || 'development',
    },
    transports,
});

// ── HTTP Request Logger Middleware (replaces morgan) ──
logger.httpMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const meta = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userId: req.user?.id || null,
        };
        if (res.statusCode >= 500) {
            logger.error(`${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
        } else if (res.statusCode >= 400) {
            logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
        } else {
            logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
        }
    });
    next();
};

// ── Audit Logger (AML/CFT ມ.22) ──
logger.audit = (action, details) => {
    logger.info(`[AUDIT] ${action}`, { audit: true, ...details });
};

module.exports = logger;
