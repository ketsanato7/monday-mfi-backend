/**
 * it-fees.routes.js
 * IT Service Fee Management — ຈັດການຄ່າບໍລິການ IT
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const { Sequelize } = require('sequelize');
const seq = db.sequelize;

// ═══════════════════════════════════════════
// GET /it-fees/configs — ລາຍການຕັ້ງຄ່າທັງໝົດ
// ═══════════════════════════════════════════
router.get('/it-fees/configs', async (req, res) => {
    try {
        const [rows] = await seq.query(
            `SELECT * FROM it_fee_configs ORDER BY id`
        );
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// PUT /it-fees/configs/:id — ແກ້ໄຂຄ່າທຳນຽມ
// ═══════════════════════════════════════════
router.put('/it-fees/configs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { fee_name, calc_method, rate, fixed_amount, min_amount, max_amount, is_active, description } = req.body;

        await seq.query(
            `UPDATE it_fee_configs SET 
                fee_name = COALESCE($1, fee_name),
                calc_method = COALESCE($2, calc_method),
                rate = COALESCE($3, rate),
                fixed_amount = COALESCE($4, fixed_amount),
                min_amount = COALESCE($5, min_amount),
                max_amount = COALESCE($6, max_amount),
                is_active = COALESCE($7, is_active),
                description = COALESCE($8, description),
                updated_at = NOW()
            WHERE id = $9`,
            { bind: [fee_name, calc_method, rate, fixed_amount, min_amount, max_amount, is_active, description, id] }
        );

        const [updated] = await seq.query(`SELECT * FROM it_fee_configs WHERE id = $1`, { bind: [id] });
        res.json({ status: true, message: 'ອັບເດດສຳເລັດ', data: updated[0] });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// POST /it-fees/charge — ເກັບຄ່າ (manual / auto)
// ═══════════════════════════════════════════
router.post('/it-fees/charge', async (req, res) => {
    try {
        const { fee_type, amount, loan_id, mfi_id, notes, billing_period } = req.body;
        const userId = req.user?.id || null;

        // Get fee config
        const [configs] = await seq.query(
            `SELECT * FROM it_fee_configs WHERE fee_type = $1 AND is_active = true`,
            { bind: [fee_type] }
        );
        if (configs.length === 0) {
            return res.json({ status: false, message: `ຄ່າທຳນຽມ ${fee_type} ບໍ່ພົບ ຫຼື ປິດໃຊ້ງານ` });
        }
        const config = configs[0];

        // Calculate fee
        let feeAmount = 0;
        if (config.calc_method === 'PERCENT') {
            if (!amount) return res.json({ status: false, message: 'ຕ້ອງລະບຸ amount ສຳລັບ PERCENT' });
            feeAmount = parseFloat(amount) * parseFloat(config.rate);
            if (parseFloat(config.min_amount) > 0) feeAmount = Math.max(feeAmount, parseFloat(config.min_amount));
            if (parseFloat(config.max_amount) > 0) feeAmount = Math.min(feeAmount, parseFloat(config.max_amount));
        } else if (config.calc_method === 'FIXED') {
            feeAmount = parseFloat(config.fixed_amount);
        } else if (config.calc_method === 'MANUAL') {
            if (!amount) return res.json({ status: false, message: 'ຕ້ອງລະບຸ amount ສຳລັບ MANUAL' });
            feeAmount = parseFloat(amount);
        }

        feeAmount = Math.round(feeAmount * 100) / 100;

        // Save to loan_fees
        await seq.query(
            `INSERT INTO loan_fees (loan_id, fee_type, fee_amount, notes, mfi_id, fee_config_id, billing_period, charged_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            { bind: [loan_id || null, fee_type, feeAmount, notes || config.fee_name, mfi_id || null, config.id, billing_period || null, userId] }
        );

        console.log(`💰 IT Fee charged: ${fee_type} = ${feeAmount}₭`);
        res.json({
            status: true,
            message: `ເກັບ ${config.fee_name}: ${feeAmount.toLocaleString()}₭`,
            data: { fee_type, fee_amount: feeAmount, config_id: config.id }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// GET /it-fees/history — ປະຫວັດການເກັບ
// ═══════════════════════════════════════════
router.get('/it-fees/history', async (req, res) => {
    try {
        const { fee_type, billing_period, limit = 100, offset = 0 } = req.query;

        let where = `WHERE lf.fee_type LIKE 'IT_%'`;
        const binds = [];
        let bindIdx = 1;

        if (fee_type) {
            where += ` AND lf.fee_type = $${bindIdx++}`;
            binds.push(fee_type);
        }
        if (billing_period) {
            where += ` AND lf.billing_period = $${bindIdx++}`;
            binds.push(billing_period);
        }

        const [rows] = await seq.query(
            `SELECT lf.*, ifc.fee_name, ifc.calc_method
             FROM loan_fees lf
             LEFT JOIN it_fee_configs ifc ON ifc.fee_type = lf.fee_type
             ${where}
             ORDER BY lf.created_at DESC
             LIMIT $${bindIdx++} OFFSET $${bindIdx++}`,
            { bind: [...binds, parseInt(limit), parseInt(offset)] }
        );

        const [countResult] = await seq.query(
            `SELECT COUNT(*) as total FROM loan_fees lf ${where}`,
            { bind: binds }
        );

        res.json({
            status: true,
            data: rows,
            total: parseInt(countResult[0].total),
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// GET /it-fees/summary — ສະຫຼຸບລາຍຮັບ
// ═══════════════════════════════════════════
router.get('/it-fees/summary', async (req, res) => {
    try {
        const { period } = req.query; // e.g. '2026-03'

        let periodFilter = '';
        const binds = [];
        if (period) {
            periodFilter = `AND (lf.billing_period = $1 OR TO_CHAR(lf.created_at, 'YYYY-MM') = $1)`;
            binds.push(period);
        }

        const [rows] = await seq.query(
            `SELECT 
                lf.fee_type,
                ifc.fee_name,
                COUNT(*) as total_count,
                SUM(lf.fee_amount) as total_amount,
                AVG(lf.fee_amount) as avg_amount,
                MIN(lf.fee_amount) as min_charged,
                MAX(lf.fee_amount) as max_charged
             FROM loan_fees lf
             LEFT JOIN it_fee_configs ifc ON ifc.fee_type = lf.fee_type
             WHERE lf.fee_type LIKE 'IT_%' ${periodFilter}
             GROUP BY lf.fee_type, ifc.fee_name
             ORDER BY total_amount DESC`,
            { bind: binds }
        );

        // Grand total
        const [grandTotal] = await seq.query(
            `SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(fee_amount), 0) as total_revenue
             FROM loan_fees
             WHERE fee_type LIKE 'IT_%' ${periodFilter}`,
            { bind: binds }
        );

        res.json({
            status: true,
            data: rows,
            summary: {
                total_transactions: parseInt(grandTotal[0].total_transactions),
                total_revenue: parseFloat(grandTotal[0].total_revenue),
                period: period || 'ທັງໝົດ',
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

module.exports = router;
