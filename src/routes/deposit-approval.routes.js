/**
 * deposit-approval.routes.js — Maker-Checker Approval for Deposit Accounts
 * 
 * Endpoints:
 *   GET  /deposit-approval/pending    — ດຶງບັນຊີ pending approval
 *   POST /deposit-approval/action     — Approve/Reject/Escalate
 */
const logger = require('../config/logger');
const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const db = require('../models');
const seq = db.sequelize;

// ── GET pending approvals ──
router.get('/deposit-approval/pending', async (req, res) => {
    try {
        const rows = await seq.query(`
            SELECT da.id, da.account_no, da.current_balance, da.risk_level, da.risk_score,
                   da.opening_date, da.account_status,
                   COALESCE(
                       pi.firstname__la || ' ' || pi.lastname__la,
                       ei.name__l_a,
                       'N/A'
                   ) as owner_name,
                   CASE WHEN dao.person_id IS NOT NULL THEN 'individual' ELSE 'enterprise' END as owner_type,
                   dp.name_la AS product_name_la
            FROM deposit_accounts da
            LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
            LEFT JOIN personal_info pi ON dao.person_id = pi.id
            LEFT JOIN enterprise_info ei ON dao.enterprise_id = ei.id
            LEFT JOIN deposit_products dp ON da.product_id = dp.id
            WHERE da.risk_level IN ('PENDING', 'MEDIUM', 'HIGH')
               OR da.account_status = 'PENDING'
            ORDER BY da.id DESC
        `, { type: QueryTypes.SELECT });

        res.json({ data: rows, status: true });
    } catch (e) {
        logger.error('❌ pending:', e.message);
        res.status(500).json({ message: e.message, status: false });
    }
});

// ── POST approval action ──
router.post('/deposit-approval/action', async (req, res) => {
    const t = await seq.transaction();
    try {
        const { accountId, action, comments } = req.body;
        if (!accountId || !action) {
            return res.status(400).json({ message: 'accountId + action required', status: false });
        }

        const userId = req.user?.id || 1;

        // Get current account
        const [acct] = await seq.query(
            'SELECT id, risk_level, account_status FROM deposit_accounts WHERE id = :id',
            { replacements: { id: accountId }, type: QueryTypes.SELECT, transaction: t }
        );
        if (!acct) {
            await t.rollback();
            return res.status(404).json({ message: 'Account not found', status: false });
        }

        const fromStatus = acct.risk_level || acct.account_status;
        let toStatus;
        if (action === 'APPROVE') toStatus = 'APPROVED';
        else if (action === 'REJECT') toStatus = 'REJECTED';
        else toStatus = 'ESCALATED';

        // Update account
        await seq.query(
            `UPDATE deposit_accounts SET risk_level = :status, approved_by = :userId, updated_at = NOW() WHERE id = :id`,
            { replacements: { status: toStatus, userId, id: accountId }, transaction: t }
        );

        // Log to deposit_approval_history
        await db.deposit_approval_history.create({
            account_id: accountId,
            user_id: userId,
            action,
            from_status: fromStatus,
            to_status: toStatus,
            comments: comments || null,
            risk_level: acct.risk_level,
            org_id: req.tenantOrgId || null,
        }, { transaction: t });

        // Log to audit_trail
        await db.audit_trail.create({
            table_name: 'deposit_accounts',
            record_id: accountId,
            action: action,
            old_data: { risk_level: fromStatus },
            new_data: { risk_level: toStatus },
            changed_fields: ['risk_level', 'approved_by'],
            user_id: userId,
            ip_address: req.ip,
            org_id: req.tenantOrgId || null,
        }, { transaction: t });

        await t.commit();
        res.json({ data: { id: accountId, status: toStatus }, message: `${action} successfully`, status: true });
    } catch (e) {
        await t.rollback();
        logger.error('❌ approval action:', e.message);
        res.status(500).json({ message: e.message, status: false });
    }
});

module.exports = router;
