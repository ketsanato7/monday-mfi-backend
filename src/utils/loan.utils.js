/**
 * Loan Utilities — Shared helpers for all loan routes
 * ════════════════════════════════════════════════════
 * ❌ ກ່ອນ: ກຳນົດຊ້ຳ ໃນ loan-lifecycle + loan-tracking
 * ✅ ຫຼັງ: 1 ໄຟລ໌ shared ທັງ system
 */

/**
 * ສ້າງ balanced JE (Dr/Cr) ໃນ 1 transaction
 * @param {object} sequelize
 * @param {object} t - transaction
 * @param {object} params
 */
async function createJE(sequelize, t, { module, amount, drAccountId, crAccountId, desc, refNo, contractId }) {
    const [jeResult] = await sequelize.query(`
        INSERT INTO journal_entries
            (transaction_date, reference_no, description, currency_code, exchange_rate,
             total_debit, total_credit, source_module, source_id, status,
             created_by, posted_by, created_at, updated_at)
        VALUES (CURRENT_DATE, :ref, :desc, 'LAK', 1, :amount, :amount,
                :module, :contractId, 'POSTED', NULL, NULL, NOW(), NOW())
        RETURNING id
    `, { replacements: { ref: refNo, desc, amount, module, contractId }, transaction: t });
    const jeId = jeResult[0].id;

    await sequelize.query(`
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, created_at, updated_at)
        VALUES (:jeId, :dr, :amount, 0, :desc, NOW(), NOW()),
               (:jeId, :cr, 0, :amount, :desc, NOW(), NOW())
    `, { replacements: { jeId, dr: drAccountId, cr: crAccountId, amount, desc }, transaction: t });

    return jeId;
}

/**
 * ສ້າງ repayment schedules (Flat / Declining)
 * @param {number} principal
 * @param {number} rate - annual rate %
 * @param {number} months - term
 * @param {Date} startDate
 * @param {string} rateType - 'FLAT' | 'DECLINING'
 * @returns {Array} schedules
 */
function generateSchedules(principal, rate, months, startDate, rateType) {
    const schedules = [];
    let remaining = principal;
    const monthlyPrincipal = Math.round((principal / months) * 100) / 100;

    for (let i = 1; i <= months; i++) {
        const due = new Date(startDate);
        due.setMonth(due.getMonth() + i);

        let interest;
        if (rateType === 'FLAT') {
            interest = Math.round((principal * rate / 100 / 12) * 100) / 100;
        } else {
            interest = Math.round((remaining * rate / 100 / 12) * 100) / 100;
        }

        const princ = i === months ? remaining : monthlyPrincipal;
        schedules.push({ installment: i, due, principal: princ, interest, total: princ + interest });
        remaining -= monthlyPrincipal;
        if (remaining < 0) remaining = 0;
    }
    return schedules;
}

/**
 * ບັນທຶກ loan_approval_history
 */
async function addApprovalHistory(sequelize, t, { contractId, userId = 3, action, fromStatus, toStatus, comment }) {
    await sequelize.query(`
        INSERT INTO loan_approval_history
            (contract_id, user_id, action, from_status, to_status, comments, created_at)
        VALUES (:cid, :uid, :action, :from, :to, :comment, NOW())
    `, { replacements: { cid: contractId, uid: userId, action, from: fromStatus, to: toStatus, comment }, transaction: t });
}

/**
 * ບັນທຶກ loan_transactions
 */
async function addLoanTransaction(sequelize, t, { contractId, type, amount, principal = 0, interest = 0, penalty = 0, method = 'CASH', refNo }) {
    await sequelize.query(`
        INSERT INTO loan_transactions
            (contract_id, transaction_type, transaction_date, amount_paid,
             principal_paid, interest_paid, penalty_paid, payment_method, reference_no)
        VALUES (:cid, :type, CURRENT_DATE, :amount, :principal, :interest, :penalty, :method, :ref)
    `, { replacements: { cid: contractId, type, amount, principal, interest, penalty, method, ref: refNo }, transaction: t });
}

module.exports = {
    createJE,
    generateSchedules,
    addApprovalHistory,
    addLoanTransaction,
};
