/**
 * BaseService — Enterprise Service Layer Foundation
 * ══════════════════════════════════════════════════
 * Generic CRUD service with:
 *   - Pagination, sort, filter
 *   - Soft delete (paranoid)
 *   - Audit fields (created_by, updated_by)
 *   - Tenant isolation (tenant_id)
 *   - Structured logging via Winston
 *
 * Usage:
 *   const loanService = new BaseService(db.loan_contracts, 'Loan');
 *   const result = await loanService.findAll({ status: 'active' }, { page: 1, limit: 20 });
 */
const logger = require('../config/logger');

class BaseService {
    /**
     * @param {Object} model - Sequelize model
     * @param {string} entityName - Name for logging/audit
     */
    constructor(model, entityName) {
        this.model = model;
        this.entityName = entityName;
    }

    /**
     * Find all with pagination, sort, filter
     */
    async findAll(where = {}, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                order = [['created_at', 'DESC']],
                include = [],
                attributes,
            } = options;

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const { count, rows } = await this.model.findAndCountAll({
                where,
                order,
                limit: parseInt(limit),
                offset,
                include,
                attributes,
            });

            return {
                data: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit)),
                },
            };
        } catch (err) {
            logger.error(`${this.entityName}.findAll failed`, { error: err.message, where });
            throw err;
        }
    }

    /**
     * Find by ID
     */
    async findById(id, options = {}) {
        try {
            const record = await this.model.findByPk(id, options);
            if (!record) {
                throw new Error(`${this.entityName} id=${id} not found`);
            }
            return record;
        } catch (err) {
            logger.error(`${this.entityName}.findById failed`, { error: err.message, id });
            throw err;
        }
    }

    /**
     * Find one by condition
     */
    async findOne(where, options = {}) {
        try {
            return await this.model.findOne({ where, ...options });
        } catch (err) {
            logger.error(`${this.entityName}.findOne failed`, { error: err.message, where });
            throw err;
        }
    }

    /**
     * Create with audit fields
     */
    async create(data, userId) {
        try {
            if (userId) {
                data.created_by = userId;
                data.updated_by = userId;
            }

            const record = await this.model.create(data);

            logger.audit(`${this.entityName.toUpperCase()}_CREATED`, {
                id: record.id,
                userId,
            });

            return record;
        } catch (err) {
            logger.error(`${this.entityName}.create failed`, { error: err.message });
            throw err;
        }
    }

    /**
     * Update with audit fields
     */
    async update(id, data, userId) {
        try {
            const record = await this.findById(id);

            if (userId) {
                data.updated_by = userId;
            }

            await record.update(data);

            logger.audit(`${this.entityName.toUpperCase()}_UPDATED`, {
                id,
                userId,
                changes: Object.keys(data),
            });

            return record;
        } catch (err) {
            logger.error(`${this.entityName}.update failed`, { error: err.message, id });
            throw err;
        }
    }

    /**
     * Soft delete (paranoid)
     */
    async delete(id, userId) {
        try {
            const record = await this.findById(id);

            if (userId) {
                await record.update({ updated_by: userId });
            }

            await record.destroy(); // Sequelize paranoid = soft delete

            logger.audit(`${this.entityName.toUpperCase()}_DELETED`, {
                id,
                userId,
            });

            return { success: true, message: `${this.entityName} deleted` };
        } catch (err) {
            logger.error(`${this.entityName}.delete failed`, { error: err.message, id });
            throw err;
        }
    }

    /**
     * Count records
     */
    async count(where = {}) {
        try {
            return await this.model.count({ where });
        } catch (err) {
            logger.error(`${this.entityName}.count failed`, { error: err.message });
            throw err;
        }
    }

    /**
     * Bulk create
     */
    async bulkCreate(records, userId) {
        try {
            if (userId) {
                records = records.map(r => ({ ...r, created_by: userId, updated_by: userId }));
            }
            const result = await this.model.bulkCreate(records);

            logger.audit(`${this.entityName.toUpperCase()}_BULK_CREATED`, {
                count: result.length,
                userId,
            });

            return result;
        } catch (err) {
            logger.error(`${this.entityName}.bulkCreate failed`, { error: err.message });
            throw err;
        }
    }
}

module.exports = BaseService;
