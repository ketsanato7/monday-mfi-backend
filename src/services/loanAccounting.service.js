/**
 * loanAccounting.service.js
 * ບໍລິການບັນທຶກບັນຊີອັດຕະໂນມັດ ຕາມຫຼັກການບັນຊີລາວ (MFI)
 *
 * ລະຫັດບັນຊີ (Chart of Accounts):
 *   1100 = ເງິນສົດ / ເງິນຝາກທະນາຄານ
 *   1300 = ເງິນໃຫ້ກູ້ຢືມ
 *   1390 = ຄ່າເຜື່ອໜີ້ສົງໄສຈຶ່ງຈະສູນ
 *   4100 = ລາຍຮັບດອກເບ້ຍ
 *   4200 = ລາຍຮັບຄ່າທຳນຽມ / ຄ່າປັບ
 *   5300 = ຄ່າໃຊ້ຈ່າຍສຳຮອງໜີ້ສູນ
 */

const logger = require('../config/logger');
const db = require('../models');
const { sequelize } = db;
const JournalEntry = db['journal_entries'];
const JournalEntryLine = db['journal_entry_lines'];

// Default account codes per Lao MFI accounting standards
const ACCOUNTS = {
    CASH: '110',            // ເງິນສົດ
    LOAN_RECEIVABLE: '130', // ເງິນໃຫ້ກູ້ຢືມ
    PROVISION: '139',       // ຄ່າເຜື່ອໜີ້ສົງໄສ
    INTEREST_INCOME: '410', // ລາຍຮັບດອກເບ້ຍ
    FEE_INCOME: '420',      // ລາຍຮັບຄ່າທຳນຽມ
    PROVISION_EXPENSE: '510' // ຄ່າໃຊ້ຈ່າຍສຳຮອງ
};

// Cache account_code → account_id mapping
let _accountIdCache = {};

/**
 * Resolve account_code → account_id from chart_of_accounts table.
 * Uses cache to avoid repeated DB lookups.
 */
async function getAccountId(accountCode) {
    if (_accountIdCache[accountCode]) return _accountIdCache[accountCode];

    const [rows] = await sequelize.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = :code LIMIT 1`,
        { replacements: { code: accountCode } }
    );

    if (rows.length === 0) {
        logger.warn(`⚠️ ບໍ່ພົບ account_code: ${accountCode} — ໃຊ້ null`);
        return null;
    }

    _accountIdCache[accountCode] = rows[0].id;
    return rows[0].id;
}

/**
 * Generate a reference number
 */
function generateRefNo(type, loanId) {
    const date = new Date();
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `LOAN-${type}-${loanId}-${ymd}-${Date.now() % 10000}`;
}

/**
 * ບັນທຶກການປ່ອຍເງິນກູ້
 * Debit  130 ເງິນໃຫ້ກູ້ຢືມ
 * Credit 110 ເງິນສົດ
 */
async function recordDisbursement(loanId, amount, description, userId, transaction) {
    const refNo = generateRefNo('DIS', loanId);
    const loanAccId = await getAccountId(ACCOUNTS.LOAN_RECEIVABLE);
    const cashAccId = await getAccountId(ACCOUNTS.CASH);

    const entry = await JournalEntry.create({
        transaction_date: new Date(),
        reference_no: refNo,
        description: description || `ປ໋ອຍເງິນກູ້ ສັນຍາ #${loanId}`,
        status: 'POSTED',
        total_debit: amount,
        total_credit: amount,
        currency_code: 'LAK',
    }, { transaction });

    await JournalEntryLine.bulkCreate([
        {
            journal_entry_id: entry.id,
            account_id: loanAccId,
            debit: amount,
            credit: 0,
            description: 'ເງິນໃຫ້ກູ້ຢືມ'
        },
        {
            journal_entry_id: entry.id,
            account_id: cashAccId,
            debit: 0,
            credit: amount,
            description: 'ເງິນສົດ / ເງິນໂອນ'
        }
    ], { transaction });

    return { entry, refNo };
}

/**
 * ບັນທຶກການຮັບເງິນຊຳລະ
 * Debit  110 ເງິນສົດ  (total)
 * Credit 130 ເງິນກູ້   (principal)
 * Credit 410 ດອກເບ້ຍ  (interest)
 * Credit 420 ຄ່າປັບ    (penalty, if any)
 */
async function recordRepayment(loanId, { principalPaid, interestPaid, penaltyPaid }, description, userId, transaction) {
    const totalPaid = (principalPaid || 0) + (interestPaid || 0) + (penaltyPaid || 0);
    const refNo = generateRefNo('REP', loanId);

    const cashAccId = await getAccountId(ACCOUNTS.CASH);
    const loanAccId = await getAccountId(ACCOUNTS.LOAN_RECEIVABLE);
    const intAccId = await getAccountId(ACCOUNTS.INTEREST_INCOME);
    const feeAccId = await getAccountId(ACCOUNTS.FEE_INCOME);

    const entry = await JournalEntry.create({
        transaction_date: new Date(),
        reference_no: refNo,
        description: description || `ຮັບເງິນຊຳລະ ສັນຍາ #${loanId}`,
        status: 'POSTED',
        total_debit: totalPaid,
        total_credit: totalPaid,
        currency_code: 'LAK',
    }, { transaction });

    const lines = [
        {
            journal_entry_id: entry.id,
            account_id: cashAccId,
            debit: totalPaid,
            credit: 0,
            description: 'ຮັບເງິນສົດ'
        }
    ];

    if (principalPaid > 0) {
        lines.push({
            journal_entry_id: entry.id,
            account_id: loanAccId,
            debit: 0,
            credit: principalPaid,
            description: 'ຊຳລະເງິນຕົ້ນ'
        });
    }

    if (interestPaid > 0) {
        lines.push({
            journal_entry_id: entry.id,
            account_id: intAccId,
            debit: 0,
            credit: interestPaid,
            description: 'ລາຍຮັບດອກເບ້ຍ'
        });
    }

    if (penaltyPaid > 0) {
        lines.push({
            journal_entry_id: entry.id,
            account_id: feeAccId,
            debit: 0,
            credit: penaltyPaid,
            description: 'ລາຍຮັບຄ່າປັບ'
        });
    }

    await JournalEntryLine.bulkCreate(lines, { transaction });
    return { entry, refNo };
}

/**
 * ບັນທຶກການຕັ້ງສຳຮອງໜີ້ເສຍ
 * Debit  530 ຄ່າໃຊ້ຈ່າຍສຳຮອງ
 * Credit 139 ຄ່າເຜື່ອໜີ້ສົງໄສ
 */
async function recordProvision(loanId, amount, description, userId, transaction) {
    const refNo = generateRefNo('PRV', loanId);
    const provExpId = await getAccountId(ACCOUNTS.PROVISION_EXPENSE);
    const provId = await getAccountId(ACCOUNTS.PROVISION);

    const entry = await JournalEntry.create({
        transaction_date: new Date(),
        reference_no: refNo,
        description: description || `ຕັ້ງສຳຮອງໜີ້ ສັນຍາ #${loanId}`,
        status: 'POSTED',
        total_debit: amount,
        total_credit: amount,
        currency_code: 'LAK',
    }, { transaction });

    await JournalEntryLine.bulkCreate([
        {
            journal_entry_id: entry.id,
            account_id: provExpId,
            debit: amount,
            credit: 0,
            description: 'ຄ່າໃຊ້ຈ່າຍສຳຮອງໜີ້ສູນ'
        },
        {
            journal_entry_id: entry.id,
            account_id: provId,
            debit: 0,
            credit: amount,
            description: 'ຄ່າເຜື່ອໜີ້ສົງໄສຈຶ່ງຈະສູນ'
        }
    ], { transaction });

    return { entry, refNo };
}

module.exports = {
    ACCOUNTS,
    getAccountId,
    recordDisbursement,
    recordRepayment,
    recordProvision,
    generateRefNo
};
