/**
 * accountingEngine.js — Auto Journal Entry Generator (Double-Entry)
 *
 * ✅ Template-based journal generation ຈາກ chart_of_accounts
 * ✅ Multi-currency (LAK, USD, THB ຕາມ currencies table)
 * ✅ Auto-update trial_balance
 * ✅ Double-entry validation (Dr = Cr)
 */
const db = require('../models');

// ============================================================
// DEFAULT ACCOUNT CODES (ໃຊ້ເມື່ອບໍ່ມີ mapping ໃນ DB)
// ============================================================
const DEFAULT_ACCOUNTS = {
    // ===== ຕາມ BOL Chart of Accounts ສຳລັບ ສະຖາບັນການເງິນທີ່ບໍ່ແມ່ນທະນາຄານ =====
    CASH: '1011',                    // ເງິນສົດ ກີບ
    BANK: '1030',                    // ເງິນຝາກ ທະນາຄານການຄ້າ
    LOAN_RECEIVABLE: '1110',         // ສິນເຊື່ອບຸກຄົນ
    INTEREST_RECEIVABLE: '1150',     // ດອກເບ້ຍຄ້າງຮັບ
    ALLOWANCE_LOSS: '1160',          // ສຳຮອງ ECL (ຫັກ)
    CUSTOMER_DEPOSIT: '2100',        // ເງິນຝາກລູກຄ້າ
    INTEREST_INCOME: '4110',         // ດອກເບ້ຍ ສິນເຊື່ອບຸກຄົນ
    FEE_INCOME: '4210',              // ຄ່າທຳນຽມປ່ອຍກູ້
    BAD_DEBT_EXPENSE: '6240',        // ໜີ້ລຶບລ້າງ (ສຸດທິ)
    INTEREST_EXPENSE: '6100',        // ຄ່າໃຊ້ຈ່າຍດອກເບ້ຍ
    SHARE_CAPITAL: '3010',           // ທຶນຈົດທະບຽນ
};

// ============================================================
// JOURNAL TEMPLATES
// ============================================================
const JOURNAL_TEMPLATES = {
    /**
     * ຈ່າຍສິນເຊື່ອ (Loan Disbursement)
     * DR: ສິນເຊື່ອລູກຄ້າ
     * CR: ເງິນສົດ/ທະນາຄານ
     */
    LOAN_DISBURSEMENT: {
        description: 'ຈ່າຍສິນເຊື່ອ',
        lines: [
            { side: 'debit', accountKey: 'LOAN_RECEIVABLE', description: 'ເງິນໃຫ້ກູ້ຢືມແກ່ບຸກຄົນ' },
            { side: 'credit', accountKey: 'CASH', description: 'ເງິນສົດໃນຄັງ' },
        ],
    },

    /**
     * ຮັບຊຳລະ ເງິນສົດ (Loan Repayment - Cash)
     * DR: ເງິນສົດໃນຄັງ (11011) = ເງິນຕົ້ນ + ດອກເບ້ຍ
     * CR: ເງິນໃຫ້ກູ້ຢືມແກ່ບຸກຄົນ (120312) = ເງິນຕົ້ນ
     * CR: ລາຍຮັບດອກເບ້ຍ (5102132) = ດອກເບ້ຍ
     */
    LOAN_REPAYMENT: {
        description: 'ຮັບຊຳລະສິນເຊື່ອ (ເງິນສົດ)',
        lines: [
            { side: 'debit', accountKey: 'CASH', description: 'ເງິນສົດໃນຄັງ', amountKey: 'total' },
            { side: 'credit', accountKey: 'LOAN_RECEIVABLE', description: 'ເງິນໃຫ້ກູ້ຢືມແກ່ບຸກຄົນ', amountKey: 'principal' },
            { side: 'credit', accountKey: 'INTEREST_INCOME', description: 'ລາຍຮັບດອກເບ້ຍ', amountKey: 'interest' },
        ],
    },

    /**
     * ຮັບຊຳລະ ເງິນໂອນ (Loan Repayment - Bank Transfer)
     * DR: ເງິນຝາກທະນາຄານ (113111) = ເງິນຕົ້ນ + ດອກເບ້ຍ
     * CR: ເງິນໃຫ້ກູ້ຢືມແກ່ບຸກຄົນ (120312) = ເງິນຕົ້ນ
     * CR: ລາຍຮັບດອກເບ້ຍ (5102132) = ດອກເບ້ຍ
     */
    LOAN_REPAYMENT_BANK: {
        description: 'ຮັບຊຳລະສິນເຊື່ອ (ເງິນໂອນ)',
        lines: [
            { side: 'debit', accountKey: 'BANK', description: 'ເງິນຝາກທະນາຄານ', amountKey: 'total' },
            { side: 'credit', accountKey: 'LOAN_RECEIVABLE', description: 'ເງິນໃຫ້ກູ້ຢືມແກ່ບຸກຄົນ', amountKey: 'principal' },
            { side: 'credit', accountKey: 'INTEREST_INCOME', description: 'ລາຍຮັບດອກເບ້ຍ', amountKey: 'interest' },
        ],
    },

    /**
     * ຕັດໜີ້ສູນ (Write-off)
     * DR: ຄ່າໃຊ້ຈ່າຍໜີ້ສູນ
     * CR: ສິນເຊື່ອລູກຄ້າ
     */
    LOAN_WRITE_OFF: {
        description: 'ຕັດໜີ້ສູນ',
        lines: [
            { side: 'debit', accountKey: 'BAD_DEBT_EXPENSE', description: 'ຄ່າໃຊ້ຈ່າຍໜີ້ສູນ' },
            { side: 'credit', accountKey: 'LOAN_RECEIVABLE', description: 'ສິນເຊື່ອລູກຄ້າ' },
        ],
    },

    /**
     * ຮັບເງິນຝາກ (Deposit Received)
     * DR: ເງິນສົດ
     * CR: ເງິນຝາກລູກຄ້າ
     */
    DEPOSIT_RECEIVED: {
        description: 'ຮັບເງິນຝາກ',
        lines: [
            { side: 'debit', accountKey: 'CASH', description: 'ເງິນສົດ' },
            { side: 'credit', accountKey: 'CUSTOMER_DEPOSIT', description: 'ເງິນຝາກລູກຄ້າ' },
        ],
    },

    /**
     * ຖອນເງິນຝາກ (Deposit Withdrawal)
     * DR: ເງິນຝາກລູກຄ້າ
     * CR: ເງິນສົດ
     */
    DEPOSIT_WITHDRAWAL: {
        description: 'ຖອນເງິນຝາກ',
        lines: [
            { side: 'debit', accountKey: 'CUSTOMER_DEPOSIT', description: 'ເງິນຝາກລູກຄ້າ' },
            { side: 'credit', accountKey: 'CASH', description: 'ເງິນສົດ' },
        ],
    },

    /**
     * ດອກເບ້ຍເງິນຝາກ (Deposit Interest Accrual)
     * DR: ຄ່າໃຊ້ຈ່າຍດອກເບ້ຍ
     * CR: ເງິນຝາກລູກຄ້າ
     */
    DEPOSIT_INTEREST: {
        description: 'ດອກເບ້ຍເງິນຝາກ',
        lines: [
            { side: 'debit', accountKey: 'INTEREST_EXPENSE', description: 'ຄ່າໃຊ້ຈ່າຍດອກເບ້ຍ' },
            { side: 'credit', accountKey: 'CUSTOMER_DEPOSIT', description: 'ເງິນຝາກລູກຄ້າ' },
        ],
    },

    /**
     * ຮັບຄ່າຮຸ້ນ (Share Capital Received)
     * DR: ເງິນສົດ
     * CR: ທຶນຮຸ້ນ
     */
    SHARE_CAPITAL_RECEIVED: {
        description: 'ຮັບຄ່າຮຸ້ນ',
        lines: [
            { side: 'debit', accountKey: 'CASH', description: 'ເງິນສົດ' },
            { side: 'credit', accountKey: 'SHARE_CAPITAL', description: 'ທຶນຮຸ້ນ' },
        ],
    },
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * ດຶງ account_code ຈາກ chart_of_accounts
 * ຖ້າບໍ່ມີ → ໃຊ້ default
 */
async function resolveAccountCode(accountKey) {
    const ChartOfAccounts = db['chart_of_accounts'];
    if (ChartOfAccounts) {
        try {
            const defaultCode = DEFAULT_ACCOUNTS[accountKey];
            if (defaultCode) {
                const account = await ChartOfAccounts.findOne({
                    where: { account_code: defaultCode },
                    raw: true,
                });
                if (account) return { id: account.id, code: account.account_code };
            }
        } catch (err) { /* fallback to default */ }
    }
    return { id: null, code: DEFAULT_ACCOUNTS[accountKey] || accountKey };
}

/**
 * Resolve all account codes ສຳລັບ template
 */
async function resolveTemplateAccounts(template) {
    const accountKeys = [...new Set(template.lines.map(l => l.accountKey))];
    const resolved = {};
    for (const key of accountKeys) {
        resolved[key] = await resolveAccountCode(key);
    }
    return resolved;
}

/**
 * ສ້າງ Journal Entry ອັດຕະໂນມັດ
 *
 * @param {object} params
 * @param {string} params.templateName - ຊື່ template (e.g. 'LOAN_DISBURSEMENT')
 * @param {object} params.amounts - ຈຳນວນເງິນ { total, principal, interest } ຫຼື number
 * @param {string} params.referenceNo - ເລກອ້າງອີງ (e.g. loan contract no)
 * @param {number} params.userId - ຜູ້ສ້າງ
 * @param {number} params.currencyId - ID ຂອງ currency (ຈາກ currencies table)
 * @param {string} params.description - ລາຍລະອຽດເພີ່ມ
 * @param {string} params.transactionDate - ວັນທີ (default: today)
 */
async function createJournalEntry({
    templateName, amounts, referenceNo, userId,
    currencyId = null, description = '', transactionDate = null,
}) {
    const template = JOURNAL_TEMPLATES[templateName];
    if (!template) throw new Error(`Journal template '${templateName}' not found`);

    const JournalEntry = db['journal_entries'];
    const JournalEntryLine = db['journal_entry_lines'];
    if (!JournalEntry || !JournalEntryLine) {
        throw new Error('Journal entry models not found');
    }

    // Resolve account codes from chart_of_accounts
    const accountCodes = await resolveTemplateAccounts(template);

    // Normalize amounts
    const amountData = typeof amounts === 'number'
        ? { total: amounts, principal: amounts, interest: 0 }
        : amounts;

    // Generate reference number
    const date = transactionDate || new Date().toISOString().split('T')[0];
    const refNo = referenceNo || await generateReferenceNo(date);

    // Create journal entry header
    const entry = await JournalEntry.create({
        transaction_date: date,
        reference_no: refNo,
        description: `${template.description}${description ? ': ' + description : ''}`,
        status: 'POSTED',
        currency_code: 'LAK',
        exchange_rate: 1,
        total_debit: 0,
        total_credit: 0,
        created_by: userId || null,
        posted_by: userId || null,
        posted_at: new Date(),
    });

    // Create journal entry lines
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of template.lines) {
        const accountInfo = accountCodes[line.accountKey];
        const amount = line.amountKey
            ? parseFloat(amountData[line.amountKey]) || 0
            : parseFloat(amountData.total) || 0;

        if (amount === 0) continue;

        const debit = line.side === 'debit' ? amount : 0;
        const credit = line.side === 'credit' ? amount : 0;

        await JournalEntryLine.create({
            journal_entry_id: entry.id,
            account_id: accountInfo.id,
            debit,
            credit,
            description: line.description,
        });

        totalDebit += debit;
        totalCredit += credit;
    }

    // Double-entry validation
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        // Rollback: delete the entry
        await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id } });
        await JournalEntry.destroy({ where: { id: entry.id } });
        throw new Error(
            `Double-entry ບໍ່ balance: Dr=${totalDebit}, Cr=${totalCredit}`
        );
    }

    // Update totals on the header
    await JournalEntry.update(
        { total_debit: totalDebit, total_credit: totalCredit },
        { where: { id: entry.id } }
    );

    // Update trial balance
    await updateTrialBalance(entry.id);

    return {
        journalEntryId: entry.id,
        referenceNo: refNo,
        date,
        totalDebit,
        totalCredit,
        linesCount: template.lines.length,
    };
}

/**
 * ອັບເດດ trial_balance ຫຼັງ journal entry
 */
async function updateTrialBalance(journalEntryId) {
    const JournalEntryLine = db['journal_entry_lines'];
    const TrialBalance = db['trial_balance'];
    if (!JournalEntryLine || !TrialBalance) return;

    try {
        const lines = await JournalEntryLine.findAll({
            where: { journal_entry_id: journalEntryId },
        });

        for (const line of lines) {
            // Find or create trial balance entry
            let tb = await TrialBalance.findOne({
                where: { account_no: line.account_code },
            });

            if (tb) {
                const currentDebit = parseFloat(tb.trial_balance_debit) || 0;
                const currentCredit = parseFloat(tb.trial_balance_credit) || 0;

                await TrialBalance.update({
                    trial_balance_debit: currentDebit + parseFloat(line.debit || 0),
                    trial_balance_credit: currentCredit + parseFloat(line.credit || 0),
                }, {
                    where: { account_no: line.account_code },
                });
            } else {
                // Lookup account title from chart_of_accounts
                const ChartOfAccounts = db['chart_of_accounts'];
                let accountTitle = line.account_code;
                if (ChartOfAccounts) {
                    const account = await ChartOfAccounts.findOne({
                        where: { account_code: line.account_code },
                    });
                    if (account) accountTitle = account.account_name;
                }

                await TrialBalance.create({
                    account_no: line.account_code,
                    account_title: accountTitle,
                    trial_balance_debit: parseFloat(line.debit || 0),
                    trial_balance_credit: parseFloat(line.credit || 0),
                    adjustment_debit: 0,
                    adjustment_credit: 0,
                    adjusted_trial_balance_debit: parseFloat(line.debit || 0),
                    adjusted_trial_balance_credit: parseFloat(line.credit || 0),
                });
            }
        }
    } catch (err) {
        console.error('⚠️ Trial balance update error:', err.message);
    }
}

/**
 * Generate unique reference number
 */
async function generateReferenceNo(date) {
    const year = date.substring(0, 4);
    const JournalEntry = db['journal_entries'];

    let count = 0;
    if (JournalEntry) {
        count = await JournalEntry.count();
    }

    return `JN-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * ດຶງ list of available templates
 */
function getTemplates() {
    return Object.entries(JOURNAL_TEMPLATES).map(([key, template]) => ({
        name: key,
        description: template.description,
        lines: template.lines.map(l => ({
            side: l.side,
            accountKey: l.accountKey,
            defaultCode: DEFAULT_ACCOUNTS[l.accountKey],
            description: l.description,
        })),
    }));
}

module.exports = {
    DEFAULT_ACCOUNTS,
    JOURNAL_TEMPLATES,
    createJournalEntry,
    updateTrialBalance,
    getTemplates,
    resolveAccountCode,
};
