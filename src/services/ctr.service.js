/**
 * CTR Service — Currency Transaction Report Engine
 * AML/CFT Article 20 Compliance
 * ════════════════════════════════════════════════
 * Auto-detects transactions ≥ 100M LAK and creates CTR reports.
 * 
 * Usage:
 *   const ctrService = require('./services/ctr.service');
 *   await ctrService.checkAndReport({ amount, currency_id, ... }, req.user);
 */
const logger = require('../config/logger');

// Default threshold: 100,000,000 LAK (AML/CFT ມ.20)
const CTR_THRESHOLD_LAK = parseInt(process.env.CTR_THRESHOLD || '100000000');

const ctrService = {
    /**
     * Check if transaction exceeds CTR threshold and auto-create report
     * @param {Object} transaction - { amount, currency_id, transaction_type, transaction_id, customer_name, customer_id, customer_type, branch_id, officer_id }
     * @param {Object} user - { id } from JWT
     * @param {Object} sequelize - Sequelize instance (from db)
     */
    async checkAndReport(transaction, user, db) {
        try {
            const amountLak = await this.convertToLak(transaction.amount, transaction.currency_id, db);

            if (amountLak < CTR_THRESHOLD_LAK) {
                return null; // Below threshold
            }

            // Generate report number: CTR-YYYY-NNNNNN
            const year = new Date().getFullYear();
            const [countResult] = await db.sequelize.query(
                `SELECT COUNT(*) + 1 AS next_no FROM ctr_reports WHERE EXTRACT(YEAR FROM created_at) = $1`,
                { bind: [year], type: db.Sequelize.QueryTypes.SELECT }
            );
            const reportNo = `CTR-${year}-${String(countResult.next_no).padStart(6, '0')}`;

            // Create CTR record
            const ctr = await db.ctr_reports.create({
                tenant_id: transaction.tenant_id || null,
                transaction_type: transaction.transaction_type,
                transaction_id: transaction.transaction_id,
                transaction_date: transaction.transaction_date || new Date(),
                amount: transaction.amount,
                currency_id: transaction.currency_id,
                amount_lak: amountLak,
                customer_type: transaction.customer_type || 'individual',
                customer_id: transaction.customer_id,
                customer_name: transaction.customer_name || 'Unknown',
                customer_id_number: transaction.customer_id_number || null,
                report_type: 'CTR',
                report_no: reportNo,
                status: 'pending',
                threshold_amount: CTR_THRESHOLD_LAK,
                branch_id: transaction.branch_id,
                officer_id: transaction.officer_id,
                created_by: user?.id,
                updated_by: user?.id,
            });

            logger.audit('CTR_CREATED', {
                reportNo,
                amount: transaction.amount,
                amountLak,
                customerId: transaction.customer_id,
                transactionType: transaction.transaction_type,
                userId: user?.id,
            });

            logger.warn(`CTR Threshold exceeded: ${amountLak.toLocaleString()} LAK (threshold: ${CTR_THRESHOLD_LAK.toLocaleString()})`, {
                reportNo,
                transactionId: transaction.transaction_id,
            });

            return ctr;
        } catch (err) {
            logger.error('CTR checkAndReport failed', { error: err.message, transaction });
            throw err;
        }
    },

    /**
     * Convert amount to LAK using current exchange rates
     */
    async convertToLak(amount, currencyId, db) {
        if (!currencyId) return amount; // Assume LAK if no currency

        // Check if already LAK (currency_id = 1 or code = 'LAK')
        const [curr] = await db.sequelize.query(
            `SELECT code FROM currencies WHERE id = $1`,
            { bind: [currencyId], type: db.Sequelize.QueryTypes.SELECT }
        );

        if (!curr || curr.code === 'LAK') return amount;

        // Get latest exchange rate
        const [rate] = await db.sequelize.query(
            `SELECT buy_rate FROM exchange_rates WHERE currency_id = $1 ORDER BY effective_date DESC LIMIT 1`,
            { bind: [currencyId], type: db.Sequelize.QueryTypes.SELECT }
        );

        if (!rate || !rate.buy_rate) {
            logger.warn(`No exchange rate found for currency_id=${currencyId}, using raw amount`);
            return amount;
        }

        return parseFloat(amount) * parseFloat(rate.buy_rate);
    },

    /**
     * Submit CTR to AMLIO (placeholder for API integration)
     */
    async submitToAmlio(ctrId, userId, db) {
        const ctr = await db.ctr_reports.findByPk(ctrId);
        if (!ctr) throw new Error('CTR not found');
        if (ctr.status !== 'pending') throw new Error(`CTR already ${ctr.status}`);

        // TODO: Integrate with AMLIO API when available
        // For now, mark as submitted with manual reference
        await ctr.update({
            status: 'submitted',
            submitted_at: new Date(),
            submitted_by: userId,
            updated_by: userId,
        });

        logger.audit('CTR_SUBMITTED', {
            ctrId,
            reportNo: ctr.report_no,
            userId,
        });

        return ctr;
    },

    /**
     * Get all pending CTR reports
     */
    async getPending(db, tenantId = null) {
        const where = { status: 'pending' };
        if (tenantId) where.tenant_id = tenantId;
        return db.ctr_reports.findAll({ where, order: [['created_at', 'DESC']] });
    },

    /**
     * Get CTR dashboard stats
     */
    async getStats(db, tenantId = null) {
        const filter = tenantId ? `AND tenant_id = ${parseInt(tenantId)}` : '';
        const [stats] = await db.sequelize.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
                COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged,
                COUNT(*) AS total,
                COALESCE(SUM(amount_lak) FILTER (WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())), 0) AS this_month_lak
            FROM ctr_reports
            WHERE deleted_at IS NULL ${filter}
        `);
        return stats[0];
    },
};

module.exports = ctrService;
