/**
 * safeCreateJE — Safe Journal Entry Creator
 * ══════════════════════════════════════════
 * ❌ ກ່ອນ: try/catch ສຳລັບ JE ຊ້ຳ 11+ ຄັ້ງ
 * ✅ ຫຼັງ: 1 function, never throws, always logs
 *
 * Usage:
 *   await safeCreateJE({
 *       templateName: 'DEPOSIT_RECEIVED',
 *       amount: 1000000,
 *       description: 'ຝາກເງິນ',
 *       referenceNo: 'DEP-001-001-0000001',
 *       userId: req.user?.id,
 *   });
 */
const logger = require('../config/logger');

let accountingEngine;
try {
    accountingEngine = require('../engines/accountingEngine');
} catch {
    logger.warn('⚠️ accountingEngine not found — JE disabled');
}

/**
 * Create a journal entry safely — never throws
 * @param {object} params
 * @param {string} params.templateName - JE template name
 * @param {number} params.amount - Total amount
 * @param {string} params.description - Description
 * @param {string} params.referenceNo - Reference number
 * @param {number} [params.userId] - User ID (default 2)
 * @param {object} [params.amountData] - Custom amount data object
 * @returns {object|null} JE result or null
 */
async function safeCreateJE({ templateName, amount, description, referenceNo, userId = 2, amountData }) {
    if (!accountingEngine) return null;

    try {
        const result = await accountingEngine.createJournalEntry({
            templateName,
            amountData: amountData || { total: amount },
            description,
            referenceNo,
            userId,
        });
        return result;
    } catch (err) {
        logger.warn(`⚠️ Auto-JE ${templateName} ບໍ່ສຳເລັດ (ບໍ່ກະທົບ transaction):`, err.message);
        return null;
    }
}

module.exports = { safeCreateJE };
