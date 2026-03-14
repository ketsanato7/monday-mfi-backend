/**
 * LoanService — Extends BaseService for Loan-specific operations
 * ══════════════════════════════════════════════════════════════
 * Includes: disbursement (with Maker-Checker), NPL detection, repayment processing
 */
const BaseService = require('./BaseService');
const logger = require('../config/logger');
const approvalService = require('./approval.service');
const ctrService = require('./ctr.service');

class LoanService extends BaseService {
    constructor(db) {
        super(db.loan_contracts, 'LoanContract');
        this.db = db;
    }

    /**
     * Request loan disbursement (Maker step — BoL 184)
     */
    async requestDisbursement(contractId, userId) {
        const contract = await this.findById(contractId);

        if (contract.status !== 'approved') {
            throw new Error(`Contract must be approved before disbursement (current: ${contract.status})`);
        }

        // Create Maker-Checker approval request
        const approval = await approvalService.requestApproval(
            'loan_disbursement',
            contractId,
            userId,
            this.db,
            {
                from_status: contract.status,
                to_status: 'disbursed',
                amount: contract.loan_amount || contract.approved_amount,
                notes: `Loan disbursement request for contract #${contractId}`,
            }
        );

        // Update contract status to pending_disbursement
        await contract.update({
            status: 'pending_disbursement',
            updated_by: userId,
        });

        logger.audit('LOAN_DISBURSEMENT_REQUESTED', {
            contractId,
            approvalId: approval?.id,
            userId,
        });

        return { contract, approval };
    }

    /**
     * Process disbursement (after Checker approves)
     */
    async processDisbursement(contractId, userId) {
        const contract = await this.findById(contractId);

        // Verify approval exists
        const isApproved = await approvalService.isApproved('loan_disbursement', contractId, this.db);
        if (!isApproved) {
            throw new Error('Disbursement not approved by checker');
        }

        // Update contract status
        await contract.update({
            status: 'disbursed',
            disbursed_date: new Date(),
            disbursed_by: userId,
            updated_by: userId,
        });

        // Check CTR threshold (AML ມ.20)
        const amount = parseFloat(contract.loan_amount || contract.approved_amount || 0);
        if (amount > 0) {
            await ctrService.checkAndReport({
                transaction_type: 'loan',
                transaction_id: contractId,
                transaction_date: new Date(),
                amount,
                currency_id: contract.currency_id,
                customer_id: contract.borrower_id,
                customer_name: contract.borrower_name || 'Unknown',
                branch_id: contract.branch_id,
                officer_id: contract.officer_id,
            }, { id: userId }, this.db);
        }

        logger.audit('LOAN_DISBURSED', { contractId, amount, userId });

        return contract;
    }

    /**
     * Get overdue loans (NPL detection)
     */
    async getOverdue(tenantId = null) {
        const where = `
            WHERE lrs.due_date < NOW() 
            AND lrs.status IN ('pending', 'partial')
            AND lc.status = 'disbursed'
            AND lc.deleted_at IS NULL
            ${tenantId ? `AND lc.tenant_id = ${parseInt(tenantId)}` : ''}
        `;

        const [rows] = await this.db.sequelize.query(`
            SELECT 
                lc.id AS contract_id,
                lc.contract_no,
                lc.borrower_id,
                lc.loan_amount,
                COUNT(lrs.id) AS overdue_installments,
                MIN(lrs.due_date) AS first_overdue_date,
                SUM(lrs.principal_amount + lrs.interest_amount - COALESCE(lrs.paid_amount, 0)) AS total_overdue_amount,
                EXTRACT(DAY FROM NOW() - MIN(lrs.due_date)) AS days_overdue
            FROM loan_contracts lc
            JOIN loan_repayment_schedules lrs ON lrs.contract_id = lc.id
            ${where}
            GROUP BY lc.id, lc.contract_no, lc.borrower_id, lc.loan_amount
            ORDER BY days_overdue DESC
        `);

        return rows;
    }

    /**
     * Get loan portfolio summary
     */
    async getPortfolioSummary(tenantId = null) {
        const filter = tenantId ? `AND tenant_id = ${parseInt(tenantId)}` : '';
        const [stats] = await this.db.sequelize.query(`
            SELECT 
                COUNT(*) AS total_loans,
                COUNT(*) FILTER (WHERE status = 'disbursed') AS active_loans,
                COUNT(*) FILTER (WHERE status = 'approved') AS approved_pending,
                COUNT(*) FILTER (WHERE status = 'closed') AS closed_loans,
                COALESCE(SUM(loan_amount) FILTER (WHERE status = 'disbursed'), 0) AS total_outstanding,
                COALESCE(SUM(loan_amount), 0) AS total_portfolio
            FROM loan_contracts
            WHERE deleted_at IS NULL ${filter}
        `);
        return stats[0];
    }
}

module.exports = LoanService;
