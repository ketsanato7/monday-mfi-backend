/**
 * asyncHandler — Unified Error Handling (merged 3 handlers → 1)
 * ══════════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: middleware/asyncHandler.js + middlewares/errorHandler.js + index.js inline
 * ✅ ຫຼັງ: 1 file, 1 globalErrorHandler, handles ALL error types
 *
 * Usage:
 *   router.get('/xxx', asyncHandler(async (req, res) => { ... }));
 *   throw new AppError('ບໍ່ພົບ', 404);
 */
const logger = require('../config/logger');

/**
 * Wrap async route handler — auto-catch errors → next(err)
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Global Error Middleware — register LAST in index.js
 * Handles: Sequelize, JWT, AppError, generic errors
 */
function globalErrorHandler(err, req, res, _next) {
    const isProd = process.env.NODE_ENV === 'production';

    // ── Sequelize validation errors ──
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        const messages = err.errors?.map(e => e.message) || [err.message];
        return res.status(400).json({ success: false, status: false, message: messages.join(', '), code: 'VALIDATION_ERROR' });
    }

    // ── Sequelize FK constraint ──
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({ success: false, status: false, message: 'ບໍ່ສາມາດດຳເນີນການ — ມີຂໍ້ມູນອ້າງອີງຢູ່', code: 'FK_CONSTRAINT' });
    }

    // ── JWT errors ──
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, status: false, message: 'Token ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ', code: 'AUTH_ERROR' });
    }

    // ── Default error ──
    const statusCode = err.statusCode || err.status || 500;
    if (statusCode >= 500) {
        logger.error('Server error', { method: req.method, url: req.originalUrl, error: err.message, stack: isProd ? undefined : err.stack });
    }

    res.status(statusCode).json({
        success: false,
        status: false,
        message: (statusCode < 500 || !isProd) ? (err.message || 'ເກີດຂໍ້ຜິດພາດ') : 'ເກີດຂໍ້ຜິດພາດພາຍໃນ',
    });
}

/**
 * AppError — Custom error with status code
 * Usage: throw new AppError('ບໍ່ພົບ', 404);
 */
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}

module.exports = { asyncHandler, globalErrorHandler, AppError };
