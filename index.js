// index.js — Monday MFI Backend Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// ===== Middlewares =====
// CORS: ກຳນົດ origin ສະເພາະ (ບໍ່ໃຊ້ wildcard * ໃນ production)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];
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
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ===== Rate Limiting (Login brute-force protection) =====
const loginAttempts = new Map();
app.use('/api/auth/login', (req, res, next) => {
    if (req.method !== 'POST') return next();
    const ip = req.ip;
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

// ===== Audit Middleware =====
app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const origSend = res.json.bind(res);
        res.json = function (body) {
            // Log audit after response
            try {
                const pathParts = req.originalUrl.replace('/api/', '').split('/');
                const tableName = pathParts[0] || 'unknown';
                const action = req.method === 'POST' ? 'CREATE' : req.method === 'PUT' ? 'UPDATE' : 'DELETE';
                const recordId = pathParts[1] || (body?.data?.id ? String(body.data.id) : null);
                const db = require('./src/models');
                db.sequelize.query(
                    `INSERT INTO audit_logs (user_id, action, table_name, record_id, description, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
                    { bind: [req.headers['x-user-id'] || null, action, tableName, recordId, `${action} ${tableName}`] }
                ).catch(() => { });
            } catch { }
            return origSend(body);
        };
    }
    next();
});

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

// ===== Audit Logger (auto-log POST/PUT/DELETE) =====
const auditLogger = require('./src/middleware/auditLogger');
app.use('/api', auditLogger);

// ===== Routes =====
const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authRoutes);

const { generateRoutes } = require('./src/utils/routeGenerator');
const BASE_PATH = '/api';
generateRoutes(app, BASE_PATH);

// ===== Custom Routes =====
const viewsRoutes = require('./src/routes/views.routes');
app.use('/api', viewsRoutes);

const paymentRoutes = require('./src/routes/payment.routes');
app.use('/api', paymentRoutes);

const uploadRoutes = require('./src/routes/upload.routes');
app.use('/api/uploads', uploadRoutes);

const loanJournalRoutes = require('./src/routes/loan_journal.routes');
app.use('/api', loanJournalRoutes);

const generalLedgerRoutes = require('./src/routes/general_ledger.routes');
app.use('/api', generalLedgerRoutes);

const journalEntryRoutes = require('./src/routes/journal_entry.routes');
app.use('/api', journalEntryRoutes);

const financialReportsRoutes = require('./src/routes/financial_reports.routes');
app.use('/api', financialReportsRoutes);

const creditReportsRoutes = require('./src/routes/credit_reports.routes');
app.use('/api', creditReportsRoutes);

const depositReportsRoutes = require('./src/routes/deposit_reports.routes');
app.use('/api', depositReportsRoutes);

const memberShareReportsRoutes = require('./src/routes/member_share_reports.routes');
app.use('/api', memberShareReportsRoutes);

const loanDisbursementRoutes = require('./src/routes/loan_disbursement.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const workflowRoutes = require('./src/routes/workflow.routes');
app.use('/api', loanDisbursementRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', workflowRoutes);

const jdbRoutes = require('./src/routes/jdb.routes');
app.use('/api', jdbRoutes);

const itFeesRoutes = require('./src/routes/it-fees.routes');
app.use('/api', itFeesRoutes);

const depositAccountRoutes = require('./src/routes/deposit_account.routes');
app.use('/api', depositAccountRoutes);

const adminRoutes = require('./src/routes/admin.routes');
app.use('/api', adminRoutes);

const borrowerRegisterRoutes = require('./src/routes/borrower_register.routes');
app.use('/api', borrowerRegisterRoutes);

const borrowerEntRoutes = require('./src/routes/borrower.routes');
app.use('/api', borrowerEntRoutes);

const autoidRoutes = require('./src/routes/autoid.routes');
app.use('/api', autoidRoutes);

const bolReportRoutes = require('./src/routes/bol_report.routes');
app.use('/api', bolReportRoutes);
const collectionRoutes = require('./src/routes/collection.routes');
app.use('/api/collection', collectionRoutes);

const mfiReportRoutes = require('./src/routes/mfi_report.routes');
app.use('/api', mfiReportRoutes);

const loanProcessRoutes = require('./src/routes/loan-process.routes');
app.use('/api', loanProcessRoutes);

const depositProcessRoutes = require('./src/routes/deposit-process.routes');
app.use('/api', depositProcessRoutes);

const depositInterestRoutes = require('./src/routes/deposit-interest.routes');
app.use('/api', depositInterestRoutes);

const depositOperationsRoutes = require('./src/routes/deposit-operations.routes');
app.use('/api', depositOperationsRoutes);

const loanTrackingRoutes = require('./src/routes/loan-tracking.routes');
app.use('/api', loanTrackingRoutes);

const loanReportsRoutes = require('./src/routes/loan-reports.routes');
app.use('/api', loanReportsRoutes);

const loanLifecycleRoutes = require('./src/routes/loan-lifecycle.routes');
app.use('/api', loanLifecycleRoutes);

const accountingEngineRoutes = require('./src/routes/accounting.engine.routes');
app.use('/api', accountingEngineRoutes);

const interestConfigsRoutes = require('./src/routes/interest_configs.routes');
app.use('/api', interestConfigsRoutes);

const businessRoutes = require('./src/routes/business.routes');
app.use('/api', businessRoutes);

const lpExtraRoutes = require('./src/routes/lp-extra.routes');
app.use('/api', lpExtraRoutes);

const hrRoutes = require('./src/routes/hr.routes');
app.use('/api', hrRoutes);


// ===== Health check =====
app.get('/', (req, res) => {
    res.json({ message: 'Monday MFI Backend API is running!', status: true });
});

// ===== Error handler =====
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// ===== Start server =====
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Monday MFI Backend running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}${BASE_PATH}`);
});
