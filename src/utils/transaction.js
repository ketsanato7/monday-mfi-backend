/**
 * Transaction Helper — withTransaction()
 * ═══════════════════════════════════════
 * ❌ ກ່ອນ: transaction boilerplate ຊ້ຳ 50+ ຄັ້ງ
 * ✅ ຫຼັງ: 1 helper ໃຊ້ທຸກບ່ອນ
 *
 * Usage:
 *   const result = await withTransaction(sequelize, async (t) => {
 *       await Model.create({...}, { transaction: t });
 *       await Model.update({...}, { transaction: t });
 *       return result;
 *   });
 */
const logger = require('../config/logger');

/**
 * Execute callback inside a managed transaction
 * Auto-commits on success, auto-rollbacks on error
 *
 * @param {object} sequelize - Sequelize instance
 * @param {Function} callback - async (transaction) => result
 * @returns {*} result from callback
 */
async function withTransaction(sequelize, callback) {
    const t = await sequelize.transaction();
    try {
        const result = await callback(t);
        await t.commit();
        return result;
    } catch (err) {
        await t.rollback();
        throw err;
    }
}

module.exports = { withTransaction };
