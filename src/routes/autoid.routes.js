/**
 * Auto ID Generator Routes
 * ── ສ້າງລະຫັດອັດຕະໂນມັດ ──
 */
const express = require('express');
const router = express.Router();

// Helper: generate code in format TABLE-YYYYMMDD-NNNN
function generateCode(prefix) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    return `${prefix}-${dateStr}-${rand}`;
}

// POST /autoid/previewID
router.post('/autoid/previewID', (req, res) => {
    const { name } = req.body || {};
    const prefix = (name || 'ID').toUpperCase().slice(0, 5);
    res.json({ data: { code: generateCode(prefix) } });
});

// POST /loan_account_auto/previewID
router.post('/loan_account_auto/previewID', (req, res) => {
    const { name, branchCode, bank_id, user_id } = req.body || {};
    const prefix = `${name || 'LN'}-${branchCode || 'HQ'}`;
    res.json({ data: { code: generateCode(prefix) } });
});

module.exports = router;
