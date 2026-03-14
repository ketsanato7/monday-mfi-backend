/**
 * Deposit Utilities — Shared helpers for all deposit routes
 * ═════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: ກຳນົດຊ້ຳ 2+ ຄັ້ງ ໃນ deposit_account + deposit-interest
 * ✅ ຫຼັງ: 1 ໄຟລ໌ shared ທັງ system
 */
const { QueryTypes } = require('sequelize');

/**
 * ສ້າງເລກບັນຊີ ຕາມມາດຕະຖານ MFI ລາວ: BBB-PP-NNNNNNN
 * @param {object} sequelize - Sequelize instance
 * @param {number} productId - Product ID  
 * @param {string} branchCode - Branch code (default '001')
 * @returns {string} Account number e.g. '001-01-0000001'
 */
async function generateAccountNo(sequelize, productId, branchCode = '001') {
    const productCode = String(productId).padStart(2, '0');
    const prefix = `${branchCode}-${productCode}-`;

    const [result] = await sequelize.query(
        `SELECT account_no FROM deposit_accounts 
         WHERE account_no LIKE :prefix
         ORDER BY account_no DESC LIMIT 1`,
        { replacements: { prefix: `${prefix}%` }, type: QueryTypes.SELECT }
    );

    let nextSeq = 1;
    if (result) {
        const lastSeq = parseInt(result.account_no.split('-')[2], 10);
        nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(7, '0')}`;
}

/**
 * ດຶງຂໍ້ມູນຜະລິດຕະພັນເງິນຝາກ
 * @param {object} sequelize
 * @param {number} productId
 * @returns {object|null} Product data
 */
async function getProduct(sequelize, productId) {
    const [product] = await sequelize.query(
        `SELECT * FROM deposit_products WHERE id = :id`,
        { replacements: { id: productId }, type: QueryTypes.SELECT }
    );
    return product || null;
}

/**
 * ກວດວ່າ ຝາກປະຈຳ ຄົບກຳນົດ ແລ້ວ ຫຼື ຍັງ
 * @param {number} termMonths - Term in months (0 = savings)
 * @param {Date|string} openingDate - Account opening date
 * @returns {{ isFixed, isMatured, daysRemaining, monthsElapsed, maturityDate }}
 */
function checkTermStatus(termMonths, openingDate) {
    termMonths = parseInt(termMonths) || 0;
    if (termMonths === 0) {
        return { isFixed: false, isMatured: false, daysRemaining: 0, monthsElapsed: 0, maturityDate: null };
    }

    const openDate = new Date(openingDate);
    const maturityDate = new Date(openDate);
    maturityDate.setMonth(maturityDate.getMonth() + termMonths);

    const now = new Date();
    const daysRemaining = Math.ceil((maturityDate - now) / (1000 * 60 * 60 * 24));
    const monthsElapsed = Math.max(0,
        (now.getFullYear() - openDate.getFullYear()) * 12 + (now.getMonth() - openDate.getMonth())
    );

    return {
        isFixed: true,
        isMatured: daysRemaining <= 0,
        daysRemaining,
        monthsElapsed,
        maturityDate,
    };
}

/**
 * ຄິດໄລ່ ດອກເບ້ຍ
 * - ຝາກປະຢັດ: balance × (rate/100) / 12 × months (ລາຍເດືອນ)
 * - ຝາກປະຈຳ: balance × (rate/100) × (termMonths/12) (ຄົບ term)
 *
 * @param {number} balance - Current balance
 * @param {number} interestRate - Annual interest rate (e.g. 3.5)
 * @param {number} termMonths - Term months (0 = savings)
 * @param {number} monthsElapsed - Months elapsed (for savings)
 * @returns {number} Interest amount
 */
function calculateInterest(balance, interestRate, termMonths, monthsElapsed = 1) {
    const rate = parseFloat(interestRate) / 100;
    balance = parseFloat(balance) || 0;

    if (termMonths === 0) {
        return parseFloat((balance * rate / 12 * monthsElapsed).toFixed(2));
    } else {
        return parseFloat((balance * rate * (termMonths / 12)).toFixed(2));
    }
}

/**
 * Format LAK amount with commas
 */
function formatLAK(amount) {
    return Number(amount).toLocaleString();
}

module.exports = {
    generateAccountNo,
    getProduct,
    checkTermStatus,
    calculateInterest,
    formatLAK,
};
