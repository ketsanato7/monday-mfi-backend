/**
 * CustomerService — Customer 360° view + KYC management
 * ═════════════════════════════════════════════════════
 */
const BaseService = require('./BaseService');
const logger = require('../config/logger');

class CustomerService extends BaseService {
    constructor(db) {
        super(db.personal_info, 'Customer');
        this.db = db;
    }

    /**
     * Customer 360° view — all related data in one call
     */
    async get360View(customerId) {
        const customer = await this.findById(customerId);

        // Parallel fetch related data
        const [loans, deposits, kycDocs, auditHistory] = await Promise.all([
            this.db.sequelize.query(`
                SELECT id, contract_no, loan_amount, status, created_at
                FROM loan_contracts 
                WHERE borrower_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC LIMIT 10
            `, { bind: [customerId], type: this.db.Sequelize.QueryTypes.SELECT }),

            this.db.sequelize.query(`
                SELECT id, account_no, balance, status, created_at
                FROM deposit_accounts 
                WHERE customer_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC LIMIT 10
            `, { bind: [customerId], type: this.db.Sequelize.QueryTypes.SELECT }),

            this.db.sequelize.query(`
                SELECT id, document_type, document_no, status, verified_at
                FROM kyc_documents
                WHERE personal_info_id = $1 AND deleted_at IS NULL
            `, { bind: [customerId], type: this.db.Sequelize.QueryTypes.SELECT }),

            this.db.sequelize.query(`
                SELECT action, table_name, old_value, new_value, created_at
                FROM audit_logs
                WHERE record_id = $1 AND table_name = 'personal_info'
                ORDER BY created_at DESC LIMIT 20
            `, { bind: [customerId], type: this.db.Sequelize.QueryTypes.SELECT }),
        ]);

        return {
            customer,
            loans,
            deposits,
            kycDocuments: kycDocs,
            auditHistory,
            summary: {
                totalLoans: loans.length,
                activeLoans: loans.filter(l => l.status === 'disbursed').length,
                totalDeposits: deposits.length,
                kycStatus: kycDocs.length > 0 ? 'verified' : 'pending',
            },
        };
    }

    /**
     * Search customers with full-text
     */
    async search(query, options = {}) {
        const { page = 1, limit = 20 } = options;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const searchTerm = `%${query}%`;

        const [rows] = await this.db.sequelize.query(`
            SELECT id, firstname__la, lastname__la, firstname__en, lastname__en,
                   phone, id_number, status, created_at
            FROM personal_info
            WHERE deleted_at IS NULL
              AND (
                firstname__la ILIKE $1 OR lastname__la ILIKE $1
                OR firstname__en ILIKE $1 OR lastname__en ILIKE $1
                OR phone ILIKE $1 OR id_number ILIKE $1
              )
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, { bind: [searchTerm, parseInt(limit), offset] });

        const [[{ count }]] = await this.db.sequelize.query(`
            SELECT COUNT(*) as count FROM personal_info
            WHERE deleted_at IS NULL
              AND (
                firstname__la ILIKE $1 OR lastname__la ILIKE $1
                OR firstname__en ILIKE $1 OR lastname__en ILIKE $1
                OR phone ILIKE $1 OR id_number ILIKE $1
              )
        `, { bind: [searchTerm] });

        return {
            data: rows,
            pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit) },
        };
    }

    /**
     * Blacklist check (AML/CFT)
     */
    async checkBlacklist(customerId) {
        const [results] = await this.db.sequelize.query(`
            SELECT id, list_type, reason, added_at
            FROM blacklist
            WHERE personal_info_id = $1 AND deleted_at IS NULL
        `, { bind: [customerId] });

        return {
            isBlacklisted: results.length > 0,
            entries: results,
        };
    }
}

module.exports = CustomerService;
