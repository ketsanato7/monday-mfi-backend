/**
 * etl.routes.js — ETL Payment SSL API Routes (Thin Controller)
 * 
 * 8 endpoints for ETL Lao Telecom payment/topup operations
 * Auto-loaded by routeGenerator → /api/etl/*
 */
const router = require('express').Router();
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/asyncHandler');
const ETL = require('../services/etl.service');

// ─────────────────────────────────────────────────
// ① Query Balance / Debt (auto-detect type)
// POST /api/etl/query-balance
// Body: { target, serviceType? }
// ─────────────────────────────────────────────────
router.post('/etl/query-balance', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const { target, serviceType } = req.body;
    if (!target) return res.status(400).json({ success: false, message: 'ກະລຸນາໃສ່ເບີ ຫຼື ID' });

    const userId = req.user?.id;
    let type = serviceType;

    // Auto-detect
    if (!type) {
        if (/^(202|302)\d+$/.test(target)) type = 'mobile';
        else if (/^(021|071)\d+$/.test(target)) type = 'pstn';
        else type = 'internet';
    }

    let result;
    if (type === 'mobile') {
        // Query subscriber type first
        const subType = await ETL.querySubscriberType(target, userId);
        if (!subType.success) return res.json(subType);

        if (subType.data.subscriberType === '0') {
            result = await ETL.queryPrepaidBalance(target, userId);
        } else {
            result = await ETL.queryPostPaidDebt(target, userId);
        }
        result.data.subscriberType = subType.data.typeName;
    } else if (type === 'pstn') {
        result = await ETL.queryPSTNDebt(target, userId);
    } else {
        result = await ETL.queryInternetDebt(target, userId);
    }

    res.json(result);
}));

// ─────────────────────────────────────────────────
// ② Query Subscriber Type
// POST /api/etl/query-subscriber
// ─────────────────────────────────────────────────
router.post('/etl/query-subscriber', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const { msisdn } = req.body;
    if (!msisdn) return res.status(400).json({ success: false, message: 'ກະລຸນາໃສ່ເບີ' });
    res.json(await ETL.querySubscriberType(msisdn, req.user?.id));
}));

// ─────────────────────────────────────────────────
// ③ Topup (Prepaid mobile / Internet)
// POST /api/etl/topup
// Body: { target, amount, serviceType?, useMasterSim? }
// ─────────────────────────────────────────────────
router.post('/etl/topup', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const { target, amount, serviceType, useMasterSim, billdate } = req.body;
    if (!target || !amount) return res.status(400).json({ success: false, message: 'ກະລຸນາໃສ່ເບີ ແລະ ຈຳນວນເງິນ' });
    if (amount <= 0) return res.status(400).json({ success: false, message: 'ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າ 0' });

    const userId = req.user?.id;
    let type = serviceType;
    if (!type) {
        type = /^(202|302)\d+$/.test(target) ? 'mobile' : 'internet';
    }

    let result;
    if (type === 'mobile') {
        result = useMasterSim
            ? await ETL.topupPrepaidMasterSim(target, amount, userId)
            : await ETL.topupPrepaid(target, amount, userId);
    } else {
        result = await ETL.topupInternetPrepaid(target, amount, billdate, userId);
    }

    res.json(result);
}));

// ─────────────────────────────────────────────────
// ④ Payment (Postpaid / PSTN / Internet)
// POST /api/etl/payment
// Body: { target, amount, serviceType?, billdate? }
// ─────────────────────────────────────────────────
router.post('/etl/payment', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const { target, amount, serviceType, billdate } = req.body;
    if (!target || !amount) return res.status(400).json({ success: false, message: 'ກະລຸນາໃສ່ເບີ ແລະ ຈຳນວນເງິນ' });
    if (amount <= 0) return res.status(400).json({ success: false, message: 'ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າ 0' });

    const userId = req.user?.id;
    let type = serviceType;
    if (!type) {
        if (/^(202|302)\d+$/.test(target)) type = 'mobile';
        else if (/^(021|071)\d+$/.test(target)) type = 'pstn';
        else type = 'internet';
    }

    let result;
    if (type === 'mobile') result = await ETL.paymentPostpaid(target, amount, billdate, userId);
    else if (type === 'pstn') result = await ETL.paymentPSTN(target, amount, billdate, userId);
    else result = await ETL.paymentInternet(target, amount, billdate, userId);

    res.json(result);
}));

// ─────────────────────────────────────────────────
// ⑤ Smart Pay — auto query → auto pay/topup
// POST /api/etl/smart-pay
// Body: { target, amount, billdate?, serviceType? }
// ─────────────────────────────────────────────────
router.post('/etl/smart-pay', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const { target, amount, billdate, serviceType } = req.body;
    if (!target || !amount) return res.status(400).json({ success: false, message: 'ກະລຸນາໃສ່ເບີ ແລະ ຈຳນວນເງິນ' });
    if (amount <= 0) return res.status(400).json({ success: false, message: 'ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າ 0' });

    res.json(await ETL.smartPay({ target, amount, billdate, serviceType }, req.user?.id));
}));

// ─────────────────────────────────────────────────
// ⑥ Query Transaction Status
// POST /api/etl/query-transaction
// Body: { serialNumber, msisdn? }
// ─────────────────────────────────────────────────
router.post('/etl/query-transaction', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const { serialNumber, msisdn } = req.body;
    if (!serialNumber) return res.status(400).json({ success: false, message: 'ກະລຸນາໃສ່ Transaction ID' });
    res.json(await ETL.queryTransaction(serialNumber, msisdn, req.user?.id));
}));

// ─────────────────────────────────────────────────
// ⑦ Test Connection — ທົດສອບ ETL API ຈິງ
// POST /api/etl/test-connection
// Body: { testNumber? } — optional test msisdn
// ─────────────────────────────────────────────────
router.post('/etl/test-connection', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const config = await ETL.getConfig();

    // ① ກວດ config ຄົບບໍ່
    const missing = [];
    if (!config.userID) missing.push('user_id');
    if (!config.signKey) missing.push('sign_key');
    if (!config.apiUrl) missing.push('api_url');

    if (missing.length > 0) {
        return res.json({
            success: false,
            message: `❌ ETL ຕັ້ງຄ່າບໍ່ຄົບ — ກະລຸນາໃສ່: ${missing.join(', ')}`,
            data: { missing, configStatus: 'incomplete' },
        });
    }

    // ② ທົດສອບ call ຈິງ ດ້ວຍ querySubscriberType
    const testNumber = req.body.testNumber || '2020000000';
    try {
        const result = await ETL.querySubscriberType(testNumber, req.user?.id);

        if (result.resultCode === '100000001') {
            // Permission deny = userID/signKey ຜິດ
            return res.json({
                success: false,
                message: '❌ ການເຊື່ອມຕໍ່ລົ້ມເຫຼວ — userID ຫຼື signKey ບໍ່ຖືກຕ້ອງ',
                data: { configStatus: 'invalid_credentials', resultCode: result.resultCode },
            });
        }

        if (result.resultCode === '100000151' || result.resultCode === '100000022') {
            return res.json({
                success: false,
                message: '❌ keyCode ບໍ່ຖືກຕ້ອງ — ກະລຸນາກວດ signKey',
                data: { configStatus: 'invalid_signkey', resultCode: result.resultCode },
            });
        }

        // ✅ ຖ້າ ETL ຕອບກັບ (ເຖິງແມ່ນເບີບໍ່ມີ = ປົກກະຕິ)
        return res.json({
            success: true,
            message: '✅ ການເຊື່ອມຕໍ່ ETL ສຳເລັດ — ລະບົບພ້ອມໃຊ້ງານ',
            data: {
                configStatus: 'connected',
                testResult: result,
                apiUrl: config.apiUrl,
                userID: `${config.userID.slice(0, 3)}***`,
            },
        });
    } catch (err) {
        return res.json({
            success: false,
            message: `❌ ເຊື່ອມຕໍ່ ETL ບໍ່ໄດ້: ${err.message}`,
            data: { configStatus: 'connection_failed', error: err.message },
        });
    }
}));

// ─────────────────────────────────────────────────
// ⑧ Error Codes Reference
// GET /api/etl/error-codes
// ─────────────────────────────────────────────────
router.get('/etl/error-codes', asyncHandler(async (_req, res) => {
    const codes = Object.entries(ETL.ETL_ERROR_CODES).map(([code, info]) => ({
        code, ...info,
    }));
    res.json({ success: true, data: codes });
}));

// ═══════════════════════════════════════════════════════════
// Config Management — ຈັດການ ETL credentials ຈາກ Web Admin
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────
// ⑨ Get Provider Config
// GET /api/etl/config
// ─────────────────────────────────────────────────
router.get('/etl/config', requirePermission('ຕັ້ງຄ່າລະບົບ'), asyncHandler(async (req, res) => {
    const db = require('../models');
    const [rows] = await db.sequelize.query(`
        SELECT id, provider, config_key, 
               CASE WHEN is_secret THEN '••••••••' ELSE config_value END AS config_value,
               is_active, is_secret, description, updated_at
        FROM payment_provider_configs
        WHERE provider = 'ETL' AND deleted_at IS NULL
        ORDER BY id
    `);
    res.json({ success: true, data: rows });
}));

// ─────────────────────────────────────────────────
// ⑩ Save Provider Config
// PUT /api/etl/config
// Body: { configs: [{ config_key, config_value }...] }
// ─────────────────────────────────────────────────
router.put('/etl/config', requirePermission('ຕັ້ງຄ່າລະບົບ'), asyncHandler(async (req, res) => {
    const { configs } = req.body;
    if (!configs || !Array.isArray(configs)) {
        return res.status(400).json({ success: false, message: 'ກະລຸນາໃສ່ configs array' });
    }

    const db = require('../models');
    const userId = req.user?.id;

    for (const cfg of configs) {
        if (!cfg.config_key || cfg.config_value === undefined) continue;

        // Skip empty secret updates (user didn't change it)
        if (cfg.config_value === '••••••••') continue;

        await db.sequelize.query(`
            UPDATE payment_provider_configs
            SET config_value = $1, updated_by = $2, updated_at = NOW()
            WHERE provider = 'ETL' AND config_key = $3 AND deleted_at IS NULL
        `, { bind: [cfg.config_value, userId, cfg.config_key] });
    }

    // Clear config cache so next call uses new values
    ETL.clearConfigCache();

    res.json({ success: true, message: 'ບັນທຶກການຕັ້ງຄ່າ ETL ສຳເລັດ' });
}));

// ─────────────────────────────────────────────────
// ⑪ Get ETL Transaction History
// GET /api/etl/transactions?page=1&limit=20
// ─────────────────────────────────────────────────
router.get('/etl/transactions', requirePermission('ຈ່າຍຄ່າໂທ'), asyncHandler(async (req, res) => {
    const db = require('../models');
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows] = await db.sequelize.query(`
        SELECT id, transaction_id, function_name, msisdn, internet_id, pstn_number,
               amount, result_code, result_description, status, retry_count, created_at
        FROM etl_transactions
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `, { bind: [limit, offset] });

    const [[{ count }]] = await db.sequelize.query(
        `SELECT COUNT(*) as count FROM etl_transactions WHERE deleted_at IS NULL`
    );

    res.json({
        success: true,
        data: rows,
        pagination: { page, limit, total: parseInt(count), totalPages: Math.ceil(count / limit) },
    });
}));

module.exports = router;
