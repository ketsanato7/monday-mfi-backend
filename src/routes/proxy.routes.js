/**
 * proxy.routes.js — Backend proxy ສຳລັບ API keys ທີ່ລັບ
 * 
 * ⚠️ ຫ້າມໃສ່ API keys ໃນ frontend code (VITE_ vars expose ໃນ browser)
 * ✅ ໃຊ້ backend proxy ເພື່ອປ້ອງກັນ API keys
 */
const logger = require('../config/logger');
const express = require('express');
const { requireAuth } = require('../middleware/rbac');
const router = express.Router();

// POST /api/proxy/ai — Proxy ສຳລັບ OpenAI API (requireAuth)
router.post('/proxy/ai', requireAuth, async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ status: false, message: 'AI service not configured' });
        }

        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (err) {
        logger.error('AI proxy error:', err.message);
        res.status(500).json({ status: false, message: 'AI service error' });
    }
});

// GET /api/proxy/maps-key — ສົ່ງ Google Maps key (restricted)
router.get('/proxy/maps-key', (req, res) => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
        return res.status(503).json({ status: false, message: 'Maps not configured' });
    }
    // ⚠️ ຄວນຕັ້ງ HTTP referrer restriction ເທິງ Google Cloud Console
    res.json({ key });
});

module.exports = router;
