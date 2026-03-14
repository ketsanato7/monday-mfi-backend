/**
 * bank-config.routes.js — CRUD ຕັ້ງຄ່າ API ທະນາຄານ
 * ✅ ເພີ່ມ / ແກ້ໄຂ / ລຶບ / ທົດສອບ API ທະນາຄານ
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/rbac');
const db = require('../models');

// ═══ GET all bank configs ═══
router.get('/bank-api-configs', requirePermission('ຈັດການລະບົບ'), async (req, res) => {
    try {
        const data = await db.bank_api_configs.findAll({
            where: { deleted_at: null },
            order: [['bank_code', 'ASC']],
        });
        // Mask secrets for security
        const masked = data.map(d => {
            const j = d.toJSON();
            if (j.client_secret) j.client_secret = '••••••' + j.client_secret.slice(-4);
            if (j.sign_secret) j.sign_secret = '••••••' + j.sign_secret.slice(-4);
            return j;
        });
        res.json({ status: true, data: masked });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══ GET single config (unmasked for edit) ═══
router.get('/bank-api-configs/:id', requirePermission('ຈັດການລະບົບ'), async (req, res) => {
    try {
        const data = await db.bank_api_configs.findByPk(req.params.id);
        if (!data) return res.status(404).json({ status: false, message: 'ບໍ່ພົບ' });
        res.json({ status: true, data });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══ POST create ═══
router.post('/bank-api-configs', requirePermission('ຈັດການລະບົບ'), async (req, res) => {
    try {
        const data = await db.bank_api_configs.create(req.body);
        res.status(201).json({ status: true, data, message: 'ສ້າງສຳເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══ PUT update ═══
router.put('/bank-api-configs/:id', requirePermission('ຈັດການລະບົບ'), async (req, res) => {
    try {
        const record = await db.bank_api_configs.findByPk(req.params.id);
        if (!record) return res.status(404).json({ status: false, message: 'ບໍ່ພົບ' });
        await record.update(req.body);
        res.json({ status: true, data: record, message: 'ອັບເດດສຳເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══ DELETE (soft) ═══
router.delete('/bank-api-configs/:id', requirePermission('ຈັດການລະບົບ'), async (req, res) => {
    try {
        const record = await db.bank_api_configs.findByPk(req.params.id);
        if (!record) return res.status(404).json({ status: false, message: 'ບໍ່ພົບ' });
        await record.update({ deleted_at: new Date() });
        res.json({ status: true, message: 'ລຶບສຳເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══ GET test connection ═══
router.get('/bank-api-configs/:id/test', requirePermission('ຈັດການລະບົບ'), async (req, res) => {
    try {
        const config = await db.bank_api_configs.findByPk(req.params.id);
        if (!config) return res.status(404).json({ status: false, message: 'ບໍ່ພົບ config' });

        // Test by calling authenticate endpoint
        const axios = require('axios');
        const testUrl = `${config.base_url}/autenticate`;
        const response = await axios.post(testUrl, {
            clientId: config.client_id,
            clientSecret: config.client_secret,
        }, { timeout: 10000 });

        const success = response.data?.result?.code === '00' || response.status === 200;
        res.json({
            status: success,
            message: success ? `✅ ${config.bank_name} ເຊື່ອມຕໍ່ສຳເລັດ` : `❌ ${config.bank_name} ເຊື່ອມຕໍ່ບໍ່ໄດ້`,
        });
    } catch (err) {
        res.json({
            status: false,
            message: `❌ ເຊື່ອມຕໍ່ບໍ່ໄດ້: ${err.message}`,
        });
    }
});

module.exports = router;
