// index.js — Monday MFI Backend Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const logger = require('./src/config/logger');

const app = express();

// ===== Middlewares =====
// CORS: ກຳນົດ origin ສະເພາະ (ບໍ່ໃຊ້ wildcard * ໃນ production)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error('CORS not allowed'));
    },
    credentials: true,
}));
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cookieParser());
// ===== HTTP Request Logger (Winston structured — replaces morgan) =====
app.use(logger.httpMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== XSS Input Sanitization (ກ່ອນທຸກ routes) =====
const sanitizeInput = require('./src/middleware/sanitize');
app.use('/api', sanitizeInput);

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ===== Global API Rate Limiting (200 req/min per IP) =====
const apiRateLimits = new Map();
setInterval(() => apiRateLimits.clear(), 60 * 1000); // cleanup every minute
app.use('/api', (req, res, next) => {
    const ip = req.ip;
    const count = (apiRateLimits.get(ip) || 0) + 1;
    apiRateLimits.set(ip, count);
    if (count > 200) {
        return res.status(429).json({ status: false, message: 'Too many requests — ກະລຸນາລໍຖ້າ' });
    }
    next();
});

// ===== Rate Limiting (Login brute-force protection) =====
const loginAttempts = new Map();
app.use('/api/auth/login', (req, res, next) => {
    if (req.method !== 'POST') return next();
    const ip = req.ip;
    // Skip rate limiting for localhost in dev/test (E2E tests)
    if (process.env.NODE_ENV !== 'production' && (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1')) return next();
    const now = Date.now();
    const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
    if (now - record.firstAttempt > 15 * 60 * 1000) { record.count = 0; record.firstAttempt = now; }
    record.count++;
    loginAttempts.set(ip, record);
    if (record.count > 10) {
        return res.status(429).json({ status: false, message: 'ເກີນຈຳນວນຄັ້ງ — ລໍຖ້າ 15 ນາທີ' });
    }
    next();
});

// NOTE: Inline audit middleware removed — uses auditLogger.js only (avoid duplicate logs)

// ===== Database =====
require('./src/models/index'); // initialize models + sequelize

// ===== RBAC Global Auth Guard =====
const { requireAuth } = require('./src/middleware/rbac');
app.use('/api', (req, res, next) => {
    // Skip auth for login endpoint and JDB callback (external webhook)
    if (req.path === '/auth/login' || req.path === '/auth/login/'
        || req.path === '/jdb/callback' || req.path === '/jdb/callback/'
        || req.path === '/v1/jdb/subscription' || req.path === '/v1/jdb/subscription/') return next();
    requireAuth(req, res, next);
});

// ===== Multi-Tenancy Filter (auto-inject org_id from JWT) =====
// ===== Audit Fields (AML/CFT ມ.22: auto-inject created_by/updated_by from JWT) =====
const auditFields = require('./src/middleware/auditFields');
app.use('/api', auditFields);
const { tenantFilter } = require('./src/middleware/tenantFilter');
app.use('/api', tenantFilter);

// ===== Audit Logger (auto-log POST/PUT/DELETE) =====
const auditLogger = require('./src/middleware/auditLogger');
app.use('/api', auditLogger);

// ===== Routes =====
// Auth routes (special mount path /api/auth — not auto-loaded)
const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authRoutes);

// Upload routes (special mount path /api/uploads)
const uploadRoutes = require('./src/routes/upload.routes');
app.use('/api/uploads', uploadRoutes);

// Collection routes (special mount path /api/collection)
const collectionRoutes = require('./src/routes/collection.routes');
app.use('/api/collection', collectionRoutes);

// MFI Registration (special mount path /api/mfi-registration)
const mfiRegistrationRoutes = require('./src/routes/mfi-registration.routes');
app.use('/api/mfi-registration', mfiRegistrationRoutes);

// Translations (function export, needs db injection — not auto-loadable)
const translationsRoutes = require('./src/routes/translations.routes');
app.use('/api', translationsRoutes(require('./src/models')));

// ===== Auto-load all other routes from src/routes/ =====
const { generateRoutes } = require('./src/utils/routeGenerator');
const BASE_PATH = '/api';
// NOTE: Routes with special mount paths (auth, uploads, collection, mfi-registration, translations)
// are excluded from auto-loading via routeGenerator's skip list.
generateRoutes(app, BASE_PATH);
// ===== Health check =====
app.get('/', (req, res) => {
    res.json({ message: 'Monday MFI Backend API is running!', status: true });
});

// ===== Error handler (unified — Sequelize, JWT, AppError, generic) =====
const { globalErrorHandler } = require('./src/middleware/asyncHandler');
app.use(globalErrorHandler);

// ===== Start server =====
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Monday MFI Backend running on port ${PORT}`);
    logger.info(`API available at http://localhost:${PORT}${BASE_PATH}`);
});
