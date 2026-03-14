/**
 * DepositService — Extends BaseService for Deposit operations
 * ════════════════════════════════════════════════════════════
 * Large deposits (≥100M LAK) trigger CTR auto-report
 */
const BaseService = require('./BaseService');
const logger = require('../config/logger');
const ctrService = require('./ctr.service');

class DepositService extends BaseService {
    constructor(db) {
        super(db.deposit_accounts, 'DepositAccount');
        this.db = db;
    }

    /**
     * Process deposit transaction with CTR check
     */
    async processDeposit(accountId, amount, currencyId, userId, options = {}) {
        const account = await this.findById(accountId);

        // Record transaction
        const transaction = await this.db.deposit_transactions.create({
            deposit_account_id: accountId,
            transaction_type: 'deposit',
            amount,
            currency_id: currencyId,
            transaction_date: new Date(),
            reference_no: options.reference_no || null,
            notes: options.notes || null,
            created_by: userId,
            updated_by: userId,
        });

        // Update account balance
        const newBalance = parseFloat(account.balance || 0) + parseFloat(amount);
        await account.update({
            balance: newBalance,
            updated_by: userId,
        });

        // CTR check (AML ມ.20 — ≥100M LAK)
        await ctrService.checkAndReport({
            transaction_type: 'deposit',
            transaction_id: transaction.id,
            transaction_date: new Date(),
            amount,
            currency_id: currencyId,
            customer_id: account.customer_id,
            customer_name: options.customer_name || 'Unknown',
            branch_id: options.branch_id,
            officer_id: userId,
        }, { id: userId }, this.db);

        logger.audit('DEPOSIT_PROCESSED', {
            accountId,
            amount,
            newBalance,
            transactionId: transaction.id,
            userId,
        });

        return { transaction, account, newBalance };
    }

    /**
     * Process withdrawal
     */
    async processWithdrawal(accountId, amount, currencyId, userId, options = {}) {
        const account = await this.findById(accountId);

        const currentBalance = parseFloat(account.balance || 0);
        if (currentBalance < parseFloat(amount)) {
            throw new Error(`Insufficient balance: ${currentBalance} < ${amount}`);
        }

        const transaction = await this.db.deposit_transactions.create({
            deposit_account_id: accountId,
            transaction_type: 'withdrawal',
            amount: -Math.abs(amount),
            currency_id: currencyId,
            transaction_date: new Date(),
            reference_no: options.reference_no || null,
            notes: options.notes || null,
            created_by: userId,
            updated_by: userId,
        });

        const newBalance = currentBalance - parseFloat(amount);
        await account.update({
            balance: newBalance,
            updated_by: userId,
        });

        logger.audit('WITHDRAWAL_PROCESSED', {
            accountId,
            amount,
            newBalance,
            transactionId: transaction.id,
            userId,
        });

        return { transaction, account, newBalance };
    }

    /**
     * Get deposit portfolio summary
     */
    async getPortfolioSummary(tenantId = null) {
        const filter = tenantId ? `AND tenant_id = ${parseInt(tenantId)}` : '';
        const [stats] = await this.db.sequelize.query(`
            SELECT
                COUNT(*) AS total_accounts,
                COUNT(*) FILTER (WHERE status = 'active') AS active_accounts,
                COALESCE(SUM(balance) FILTER (WHERE status = 'active'), 0) AS total_deposits
            FROM deposit_accounts
            WHERE deleted_at IS NULL ${filter}
        `);
        return stats[0];
    }
}

module.exports = DepositService;
