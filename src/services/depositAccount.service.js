/**
 * DepositAccountService — ລວມ logic ຈາກ 4 ໄຟລ໌ deposit routes
 * ══════════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: deposit_account.routes.js (855 ແຖວ) + 3 ໄຟລ໌ duplicate
 * ✅ ຫຼັງ: 1 service ລວມສູນ, routes ເປັນ thin controller
 *
 * Business Rules (MFI ລາວ):
 *   BR-O1: ຕ້ອງມີ person_id / product_id
 *   BR-O3: ເງິນຝາກເປີດ ≥ minimum_balance
 *   BR-O4: ເລກບັນຊີ auto: BBB-PP-NNNNNNN
 *   BR-D1: ບັນຊີຕ້ອງ ACTIVE
 *   BR-D2: ຈຳນວນ > 0
 *   BR-D6: Auto JE
 *   BR-W3: ເຫຼືອ ≥ minimum_balance (ປະຢັດ)
 *   BR-W4: ຖອນກ່ອນກຳນົດ → ຄ່າທຳນຽມ 1%
 *   BR-W5: ຄົບກຳນົດ → ດອກເບ້ຍ
 *   BR-C1: balance = 0 ກ່ອນປິດ
 *   BR-I1: ຝາກປະຢັດ ດອກເບ້ຍລາຍເດືອນ
 *   BR-I2: ຝາກປະຈຳ ດອກເບ້ຍຄົບ term
 */
const { QueryTypes } = require('sequelize');
const { AppError } = require('../middleware/asyncHandler');
const { withTransaction } = require('../utils/transaction');
const { safeCreateJE } = require('../utils/safeCreateJE');
const { generateAccountNo, getProduct, checkTermStatus, calculateInterest, formatLAK } = require('../utils/deposit.utils');
const logger = require('../config/logger');

class DepositAccountService {
    constructor(db) {
        this.db = db;
        this.sequelize = db.sequelize;
    }

    // ══════════════════════════════════════
    // ລາຍການບັນຊີ
    // ══════════════════════════════════════
    async getAll() {
        return this.sequelize.query(
            `SELECT 
                da.id, da.account_no, da.product_id, da.currency_id,
                da.opening_date, da.account_status, da.current_balance,
                da.accrued_interest, da.created_at,
                dp.product_name_la AS product_name,
                dp.product_name_en, dp.interest_rate, dp.minimum_balance, dp.term_months,
                COALESCE(pi.firstname_la || ' ' || pi.lastname_la, 'N/A') AS owner_name,
                pi.id AS person_id
             FROM deposit_accounts da
             LEFT JOIN deposit_products dp ON dp.id = da.product_id
             LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
             LEFT JOIN personal_infos pi ON pi.id = dao.person_id
             ORDER BY da.created_at DESC`,
            { type: QueryTypes.SELECT }
        );
    }

    async getById(id) {
        const [account] = await this.sequelize.query(
            `SELECT 
                da.*, 
                dp.product_name_la AS product_name, dp.interest_rate,
                dp.minimum_balance, dp.term_months,
                COALESCE(pi.firstname_la || ' ' || pi.lastname_la, 'N/A') AS owner_name,
                pi.id AS person_id
             FROM deposit_accounts da
             LEFT JOIN deposit_products dp ON dp.id = da.product_id
             LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
             LEFT JOIN personal_infos pi ON pi.id = dao.person_id
             WHERE da.id = :id`,
            { replacements: { id }, type: QueryTypes.SELECT }
        );
        if (!account) throw new AppError('ບໍ່ພົບບັນຊີ', 404);

        const termStatus = checkTermStatus(account.term_months, account.opening_date || account.created_at);
        const calculated_interest = calculateInterest(
            parseFloat(account.current_balance), account.interest_rate,
            parseInt(account.term_months) || 0, termStatus.monthsElapsed || 1
        );

        return { ...account, term_status: termStatus, calculated_interest };
    }

    async getProducts() {
        return this.sequelize.query(`SELECT * FROM deposit_products ORDER BY id ASC`, { type: QueryTypes.SELECT });
    }

    async getStatement(accountId) {
        return this.sequelize.query(
            `SELECT * FROM deposit_transactions WHERE account_id = :id ORDER BY transaction_date DESC`,
            { replacements: { id: accountId }, type: QueryTypes.SELECT }
        );
    }

    // ══════════════════════════════════════
    // BR-O: ເປີດບັນຊີ
    // ══════════════════════════════════════
    async open({ person_id, product_id, currency_id = 1, initial_amount = 0 }, userId) {
        if (!person_id || !product_id) throw new AppError('ກະລຸນາເລືອກລູກຄ້າ ແລະ ຜະລິດຕະພັນ');

        const product = await getProduct(this.sequelize, product_id);
        if (!product) throw new AppError('ບໍ່ພົບຜະລິດຕະພັນເງິນຝາກ');

        const minBalance = parseFloat(product.minimum_balance) || 0;
        if (initial_amount > 0 && initial_amount < minBalance) {
            throw new AppError(`ເງິນຝາກເປີດບັນຊີ ຕ້ອງ ≥ ${formatLAK(minBalance)} ກີບ`);
        }

        return withTransaction(this.sequelize, async (t) => {
            const account_no = await generateAccountNo(this.sequelize, product_id);

            const [accountResult] = await this.sequelize.query(
                `INSERT INTO deposit_accounts (account_no, product_id, currency_id, current_balance, opening_date)
                 VALUES (:account_no, :product_id, :currency_id, :balance, NOW()) RETURNING *`,
                { replacements: { account_no, product_id, currency_id, balance: initial_amount || 0 }, type: QueryTypes.INSERT, transaction: t }
            );
            const accountId = accountResult[0]?.id || accountResult[0];

            await this.sequelize.query(
                `INSERT INTO deposit_account_owners (account_id, person_id) VALUES (:account_id, :person_id)`,
                { replacements: { account_id: accountId, person_id }, transaction: t }
            );

            if (initial_amount > 0) {
                await this.sequelize.query(
                    `INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                     VALUES (:account_id, 'DEPOSIT', :amount, :balance, :ref, 'ເງິນຝາກເປີດບັນຊີ')`,
                    { replacements: { account_id: accountId, amount: initial_amount, balance: initial_amount, ref: `DEP-OPEN-${account_no}` }, transaction: t }
                );
                await safeCreateJE({ templateName: 'DEPOSIT_RECEIVED', amount: initial_amount, description: `ເງິນຝາກເປີດບັນຊີ ${account_no}`, referenceNo: `DEP-OPEN-${account_no}`, userId });
            }

            return { id: accountId, account_no, product_name: product.product_name_la };
        });
    }

    // ══════════════════════════════════════
    // BR-D: ຝາກເງິນ
    // ══════════════════════════════════════
    async deposit(accountId, amount, userId, remarks = '') {
        if (!amount || amount <= 0) throw new AppError('ຈຳນວນເງິນຝາກ ຕ້ອງ > 0');

        return withTransaction(this.sequelize, async (t) => {
            const [updated] = await this.sequelize.query(
                `UPDATE deposit_accounts SET current_balance = current_balance + :amount, updated_at = NOW()
                 WHERE id = :id AND account_status = 'ACTIVE' RETURNING account_no, current_balance`,
                { replacements: { amount, id: accountId }, type: QueryTypes.UPDATE, transaction: t }
            );
            if (!updated || updated.length === 0) throw new AppError('ບໍ່ພົບບັນຊີ ຫຼື ບັນຊີບໍ່ active');

            const { current_balance: newBalance, account_no: accountNo } = updated[0];
            const ref = `DEP-${accountNo}-${Date.now()}`;

            await this.sequelize.query(
                `INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                 VALUES (:account_id, 'DEPOSIT', :amount, :balance, :ref, :remarks)`,
                { replacements: { account_id: accountId, amount, balance: newBalance, ref, remarks: remarks || 'ຝາກເງິນ' }, transaction: t }
            );
            await safeCreateJE({ templateName: 'DEPOSIT_RECEIVED', amount, description: `ຝາກເງິນ ${accountNo} ຈຳນວນ ${formatLAK(amount)} ກີບ`, referenceNo: ref, userId });

            return { balance: newBalance, message: `ຝາກເງິນສຳເລັດ ${formatLAK(amount)} ກີບ — ຍອດໃໝ່: ${formatLAK(newBalance)} ກີບ` };
        });
    }

    // ══════════════════════════════════════
    // BR-W: ຖອນເງິນ
    // ══════════════════════════════════════
    async withdraw(accountId, amount, userId, remarks = '') {
        if (!amount || amount <= 0) throw new AppError('ຈຳນວນເງິນຖອນ ຕ້ອງ > 0');

        return withTransaction(this.sequelize, async (t) => {
            const [account] = await this.sequelize.query(
                `SELECT da.account_no, da.current_balance, da.opening_date, da.created_at,
                        dp.minimum_balance, dp.term_months, dp.interest_rate, dp.product_name_la
                 FROM deposit_accounts da LEFT JOIN deposit_products dp ON dp.id = da.product_id
                 WHERE da.id = :id AND da.account_status = 'ACTIVE'`,
                { replacements: { id: accountId }, type: QueryTypes.SELECT }
            );
            if (!account) throw new AppError('ບໍ່ພົບບັນຊີ ຫຼື ບໍ່ active');

            const currentBalance = parseFloat(account.current_balance);
            const minBalance = parseFloat(account.minimum_balance) || 0;
            const termMonths = parseInt(account.term_months) || 0;
            const termStatus = checkTermStatus(termMonths, account.opening_date || account.created_at);

            let earlyWithdrawalFee = 0, interestPayout = 0;

            if (termStatus.isFixed) {
                if (!termStatus.isMatured) {
                    earlyWithdrawalFee = parseFloat((amount * 0.01).toFixed(2));
                } else {
                    interestPayout = calculateInterest(currentBalance, account.interest_rate, termMonths);
                }
            }

            const totalDeduction = amount + earlyWithdrawalFee;
            if (totalDeduction > currentBalance) throw new AppError(`ຍອດເງິນບໍ່ພຽງພໍ. ປັດຈຸບັນ: ${formatLAK(currentBalance)} ກີບ`);

            const balanceAfter = currentBalance - totalDeduction + interestPayout;
            if (!termStatus.isFixed && balanceAfter < minBalance && balanceAfter > 0) {
                throw new AppError(`ຍອດເຫຼືອຕ້ອງ ≥ ${formatLAK(minBalance)} ກີບ. ຖອນໄດ້ສູງສຸດ: ${formatLAK(currentBalance - minBalance)} ກີບ`);
            }

            const [updated] = await this.sequelize.query(
                `UPDATE deposit_accounts SET current_balance = current_balance - :totalDeduction + :interestPayout, updated_at = NOW()
                 WHERE id = :id RETURNING current_balance`,
                { replacements: { totalDeduction, interestPayout, id: accountId }, type: QueryTypes.UPDATE, transaction: t }
            );
            const newBalance = updated[0].current_balance;
            const ref = `WDR-${account.account_no}-${Date.now()}`;

            await this.sequelize.query(
                `INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                 VALUES (:account_id, 'WITHDRAWAL', :amount, :balance, :ref, :remarks)`,
                { replacements: { account_id: accountId, amount, balance: newBalance, ref, remarks: remarks || 'ຖອນເງິນ' }, transaction: t }
            );

            if (earlyWithdrawalFee > 0) {
                await this.sequelize.query(
                    `INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                     VALUES (:account_id, 'FEE', :amount, :balance, :ref, 'ຄ່າທຳນຽມຖອນກ່ອນກຳນົດ 1%')`,
                    { replacements: { account_id: accountId, amount: earlyWithdrawalFee, balance: newBalance, ref: `FEE-${account.account_no}-${Date.now()}` }, transaction: t }
                );
                await safeCreateJE({ templateName: 'FEE_INCOME', amount: earlyWithdrawalFee, description: `ຄ່າທຳນຽມຖອນກ່ອນກຳນົດ ${account.account_no}`, referenceNo: ref, userId });
            }

            if (interestPayout > 0) {
                await this.sequelize.query(
                    `INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                     VALUES (:account_id, 'INTEREST', :amount, :balance, :ref, 'ດອກເບ້ຍຝາກປະຈຳຄົບກຳນົດ')`,
                    { replacements: { account_id: accountId, amount: interestPayout, balance: newBalance, ref: `INT-${account.account_no}-${Date.now()}` }, transaction: t }
                );
                await safeCreateJE({ templateName: 'INTEREST_EXPENSE', amount: interestPayout, description: `ດອກເບ້ຍ ${account.account_no}`, referenceNo: ref, userId });
            }

            await safeCreateJE({ templateName: 'DEPOSIT_WITHDRAWAL', amount, description: `ຖອນເງິນ ${account.account_no}`, referenceNo: ref, userId });

            let msg = `ຖອນເງິນສຳເລັດ ${formatLAK(amount)} ກີບ`;
            if (earlyWithdrawalFee > 0) msg += ` | ຄ່າທຳນຽມ: ${formatLAK(earlyWithdrawalFee)} ກີບ`;
            if (interestPayout > 0) msg += ` | ດອກເບ້ຍ: ${formatLAK(interestPayout)} ກີບ`;
            msg += ` | ຍອດເຫຼືອ: ${formatLAK(newBalance)} ກີບ`;

            return { balance: newBalance, earlyWithdrawalFee, interestPayout, message: msg };
        });
    }

    // ══════════════════════════════════════
    // BR-I: ຄິດດອກເບ້ຍ
    // ══════════════════════════════════════
    async calculateAndPayInterest(accountId, userId) {
        return withTransaction(this.sequelize, async (t) => {
            const [account] = await this.sequelize.query(
                `SELECT da.*, dp.interest_rate, dp.term_months, dp.product_name_la
                 FROM deposit_accounts da LEFT JOIN deposit_products dp ON dp.id = da.product_id
                 WHERE da.id = :id AND da.account_status = 'ACTIVE'`,
                { replacements: { id: accountId }, type: QueryTypes.SELECT }
            );
            if (!account) throw new AppError('ບໍ່ພົບບັນຊີ ຫຼື ບໍ່ active');

            const balance = parseFloat(account.current_balance);
            const termMonths = parseInt(account.term_months) || 0;
            const termStatus = checkTermStatus(termMonths, account.opening_date || account.created_at);
            const interest = calculateInterest(balance, account.interest_rate, termMonths, termStatus.monthsElapsed || 1);

            if (interest <= 0) return { interest: 0, message: 'ບໍ່ມີດອກເບ້ຍທີ່ຕ້ອງຈ່າຍ' };

            await this.sequelize.query(
                `UPDATE deposit_accounts SET current_balance = current_balance + :interest, accrued_interest = COALESCE(accrued_interest, 0) + :interest, updated_at = NOW()
                 WHERE id = :id`,
                { replacements: { interest, id: accountId }, transaction: t }
            );

            const ref = `INT-${account.account_no}-${Date.now()}`;
            await this.sequelize.query(
                `INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                 VALUES (:account_id, 'INTEREST', :amount, :balance, :ref, :remarks)`,
                { replacements: { account_id: accountId, amount: interest, balance: balance + interest, ref,
                    remarks: termMonths === 0 ? `ດອກເບ້ຍປະຢັດລາຍເດືອນ (${account.interest_rate}%/ປີ)` : `ດອກເບ້ຍຝາກປະຈຳ ${termMonths} ເດືອນ (${account.interest_rate}%/ປີ)` }, transaction: t }
            );
            await safeCreateJE({ templateName: 'INTEREST_EXPENSE', amount: interest, description: `ດອກເບ້ຍ ${account.product_name_la} ${account.account_no}`, referenceNo: ref, userId });

            return { interest, newBalance: balance + interest, interestRate: account.interest_rate, productName: account.product_name_la,
                message: `ຄິດດອກເບ້ຍສຳເລັດ: ${formatLAK(interest)} ກີບ (${account.interest_rate}%/ປີ)` };
        });
    }

    // ══════════════════════════════════════
    // BR-C: ປິດບັນຊີ
    // ══════════════════════════════════════
    async close(accountId) {
        return withTransaction(this.sequelize, async (t) => {
            const [account] = await this.sequelize.query(
                `SELECT da.*, dp.interest_rate, dp.term_months
                 FROM deposit_accounts da LEFT JOIN deposit_products dp ON dp.id = da.product_id
                 WHERE da.id = :id AND da.account_status = 'ACTIVE'`,
                { replacements: { id: accountId }, type: QueryTypes.SELECT }
            );
            if (!account) throw new AppError('ບໍ່ພົບບັນຊີ ຫຼື ປິດແລ້ວ');

            if (parseFloat(account.current_balance) > 0) {
                throw new AppError(`ຕ້ອງຖອນເງິນໃຫ້ໝົດກ່ອນປິດ. ຍອດຄ້າງ: ${formatLAK(account.current_balance)} ກີບ`);
            }

            await this.sequelize.query(
                `UPDATE deposit_accounts SET account_status = 'CLOSED', updated_at = NOW() WHERE id = :id`,
                { replacements: { id: accountId }, transaction: t }
            );
            await this.sequelize.query(
                `INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                 VALUES (:account_id, 'CLOSE', 0, 0, :ref, 'ປິດບັນຊີ')`,
                { replacements: { account_id: accountId, ref: `CLS-${account.account_no}-${Date.now()}` }, transaction: t }
            );

            return { message: `ປິດບັນຊີ ${account.account_no} ສຳເລັດ` };
        });
    }
}

module.exports = DepositAccountService;
