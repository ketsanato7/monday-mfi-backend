/**
 * Borrower Routes — Enterprise API
 * ═══════════════════════════════════════════════════
 * POST /borrowers/full-create  → Single transaction create
 */
const logger = require('../config/logger');
const db = require('../models');
const { requirePermission } = require('../middleware/rbac');
const express = require('express');
const router = express.Router();
const borrowerService = require('../services/borrower.service');

// ═══════════════════════════════════════
// POST /borrowers/full-create
// Create full borrower with single transaction
// ═══════════════════════════════════════
router.post('/borrowers/full-create', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const result = await borrowerService.createFullBorrower(req.body);
        res.json(result);
    } catch (err) {
        logger.error('❌ Borrower full-create failed:', err.message);
        res.status(500).json({
            success: false,
            message: 'ເກີດຂໍ້ຜິດພາດໃນການປ່ອຍກູ້',
            error: err.message,
        });
    }
});

module.exports = router;
