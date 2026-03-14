/**
 * Approval Service — Maker-Checker Engine
 * BoL Decree 184 Compliance
 * ════════════════════════════════════════
 * Generic maker-checker workflow for any entity.
 * 
 * Usage:
 *   const approvalService = require('./services/approval.service');
 *   await approvalService.requestApproval('loan_disbursement', loanId, userId, db);
 */
const logger = require('../config/logger');

// Entity types that require Maker-Checker approval
const APPROVAL_ENTITIES = {
    'loan_disbursement': { required_level: 2, min_amount: 0 },
    'loan_contract': { required_level: 2, min_amount: 0 },
    'transfer': { required_level: 2, min_amount: 50000000 },          // ≥50M LAK
    'account_freeze': { required_level: 2, min_amount: 0 },
    'account_unfreeze': { required_level: 2, min_amount: 0 },
    'blacklist_add': { required_level: 2, min_amount: 0 },
    'blacklist_remove': { required_level: 2, min_amount: 0 },
    'deposit_large': { required_level: 2, min_amount: 100000000 },    // ≥100M LAK
};

const approvalService = {
    /**
     * Request approval (Maker step)
     */
    async requestApproval(entityType, entityId, userId, db, options = {}) {
        try {
            const config = APPROVAL_ENTITIES[entityType];
            if (!config) {
                logger.warn(`No approval config for entity type: ${entityType}`);
                return null; // Entity type doesn't require approval
            }

            // Check if already has pending approval
            const existing = await db.approval_workflows.findOne({
                where: { entity_type: entityType, entity_id: entityId, status: 'pending' }
            });

            if (existing) {
                throw new Error(`Pending approval already exists (ID: ${existing.id})`);
            }

            const approval = await db.approval_workflows.create({
                tenant_id: options.tenant_id || null,
                entity_type: entityType,
                entity_id: entityId,
                requested_by: userId,
                status: 'pending',
                from_status: options.from_status || null,
                to_status: options.to_status || null,
                amount: options.amount || null,
                notes: options.notes || null,
                approval_level: 1,
                required_level: config.required_level,
                created_by: userId,
                updated_by: userId,
            });

            logger.audit('APPROVAL_REQUESTED', {
                approvalId: approval.id,
                entityType,
                entityId,
                userId,
                amount: options.amount,
            });

            return approval;
        } catch (err) {
            logger.error('requestApproval failed', { error: err.message, entityType, entityId });
            throw err;
        }
    },

    /**
     * Approve (Checker step)
     */
    async approve(approvalId, userId, db, notes = '') {
        try {
            const approval = await db.approval_workflows.findByPk(approvalId);
            if (!approval) throw new Error('Approval not found');
            if (approval.status !== 'pending') throw new Error(`Already ${approval.status}`);
            if (approval.requested_by === userId) throw new Error('Maker cannot be Checker (BoL 184)');

            await approval.update({
                status: 'approved',
                approved_by: userId,
                approval_level: approval.required_level,
                notes,
                updated_by: userId,
            });

            logger.audit('APPROVAL_APPROVED', {
                approvalId: approval.id,
                entityType: approval.entity_type,
                entityId: approval.entity_id,
                approvedBy: userId,
                requestedBy: approval.requested_by,
            });

            return approval;
        } catch (err) {
            logger.error('approve failed', { error: err.message, approvalId });
            throw err;
        }
    },

    /**
     * Reject
     */
    async reject(approvalId, userId, db, reason = '') {
        try {
            const approval = await db.approval_workflows.findByPk(approvalId);
            if (!approval) throw new Error('Approval not found');
            if (approval.status !== 'pending') throw new Error(`Already ${approval.status}`);

            await approval.update({
                status: 'rejected',
                approved_by: userId,
                rejection_reason: reason,
                updated_by: userId,
            });

            logger.audit('APPROVAL_REJECTED', {
                approvalId: approval.id,
                entityType: approval.entity_type,
                entityId: approval.entity_id,
                rejectedBy: userId,
                reason,
            });

            return approval;
        } catch (err) {
            logger.error('reject failed', { error: err.message, approvalId });
            throw err;
        }
    },

    /**
     * Get approval history for an entity
     */
    async getHistory(entityType, entityId, db) {
        return db.approval_workflows.findAll({
            where: { entity_type: entityType, entity_id: entityId },
            order: [['created_at', 'DESC']],
        });
    },

    /**
     * Get all pending approvals (for checker dashboard)
     */
    async getPending(db, tenantId = null) {
        const where = { status: 'pending' };
        if (tenantId) where.tenant_id = tenantId;
        return db.approval_workflows.findAll({
            where,
            order: [['created_at', 'ASC']],
        });
    },

    /**
     * Check if entity requires approval
     */
    requiresApproval(entityType, amount = 0) {
        const config = APPROVAL_ENTITIES[entityType];
        if (!config) return false;
        return amount >= config.min_amount;
    },

    /**
     * Check if entity has been approved
     */
    async isApproved(entityType, entityId, db) {
        const approval = await db.approval_workflows.findOne({
            where: { entity_type: entityType, entity_id: entityId, status: 'approved' }
        });
        return !!approval;
    },
};

module.exports = approvalService;
