/**
 * sms-collection.routes.js — SMS Reminder + Collection Auto-assign API
 */
const router = require('express').Router();
const { requireAuth } = require('../middleware/rbac');
const { generateReminders, getLoanNotifications, getReminderStats } = require('../engines/smsReminder');
const { autoAssign, getWorkloadSummary, logActionResult } = require('../engines/collectionAutoAssign');
const db = require('../models');
const sequelize = db.sequelize;

// ═════════════════════════════
// SMS REMINDER ENDPOINTS
// ═════════════════════════════

// ─── Generate reminders for today ───
router.post('/sms/generate', requireAuth, async (req, res) => {
    try {
        const result = await generateReminders();
        res.json({ status: true, data: result, message: `ສ້າງ ${result.created} reminders ສຳ ເລັດ` });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Get reminders for a loan ───
router.get('/sms/loan/:contractId', requireAuth, async (req, res) => {
    try {
        const notifications = await getLoanNotifications(req.params.contractId);
        res.json({ status: true, data: notifications });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Reminder stats (30 days) ───
router.get('/sms/stats', requireAuth, async (req, res) => {
    try {
        const stats = await getReminderStats();
        res.json({ status: true, data: stats });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═════════════════════════════
// COLLECTION AUTO-ASSIGN
// ═════════════════════════════

// ─── Auto-assign overdue loans ───
router.post('/collection/auto-assign', requireAuth, async (req, res) => {
    try {
        const result = await autoAssign();
        res.json({ status: true, data: result, message: `ມອບ ໝາຍ ${result.assigned} ສັນ ຍາ ສຳ ເລັດ` });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Workload summary ───
router.get('/collection/workload', requireAuth, async (req, res) => {
    try {
        const summary = await getWorkloadSummary();
        res.json({ status: true, data: summary });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Log collection action result ───
router.put('/collection/action/:actionId/result', requireAuth, async (req, res) => {
    try {
        const { result, notes } = req.body;
        if (!result) return res.status(400).json({ status: false, message: 'ກະລຸ ນາ ລະ ບຸ ຜົນ' });
        await logActionResult(req.params.actionId, result, notes || '');
        res.json({ status: true, message: 'ບັນ ທຶກ ຜົນ ສຳ ເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ─── Get pending actions for officer ───
router.get('/collection/my-actions', requireAuth, async (req, res) => {
    try {
        const userId = req.user?.userId || 1;
        const [actions] = await sequelize.query(`
            SELECT ca.*, lc.contract_no, lc.days_past_due, lc.remaining_balance,
                   pi.firstname__la, pi.lastname__la,
                   cd.contact_value as phone_number
            FROM collection_actions ca
            JOIN loan_contracts lc ON lc.id = ca.contract_id
            LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
            LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
            LEFT JOIN contact_details cd ON cd.person_id = pi.id
            WHERE ca.officer_id = $1
            AND ca.contact_result IS NULL
            ORDER BY ca.dpd_at_action DESC
            LIMIT 50
        `, { bind: [userId] });
        res.json({ status: true, data: actions });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
