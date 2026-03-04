/**
 * deposit_account.routes.js — ລະບົບຈັດການບັນຊີເງິນຝາກ
 *
 * ══════════════════════════════════════════════════════════════
 * Business Rules ຕາມຫຼັກການ MFI ລາວ:
 * ══════════════════════════════════════════════════════════════
 *
 * BR-O1: ລູກຄ້າ ຕ້ອງ ມີ personal_info ກ່ອນ ເປີດ ບັນ ຊີ
 * BR-O2: 1 ລູກຄ້າ ສາມາດ ມີ ຫຼາຍ ບັນຊີ
 * BR-O3: ຖ້າ ຝາກ ເງິນ ເປີດ → ຕ້ອງ ≥ minimum_balance ຂອງ product
 * BR-O4: ເລກ ບັນ ຊີ auto ຕາມ ຮູບ ແບບ BBB-PP-NNNNNNN
 *
 * BR-D1: ບັນ ຊີ ຕ້ອງ ACTIVE
 * BR-D2: ຈຳ ນວນ ເງິນ ຕ້ອງ > 0
 * BR-D6: Auto JE: Dr ເງິນ ສົດ / Cr ເງິນ ຝາກ ລູກ ຄ້າ
 *
 * BR-W1: ບັນ ຊີ ຕ້ອງ ACTIVE
 * BR-W2: ຈຳ ນວນ ຕ້ອງ > 0
 * BR-W3: ເງິນ ຝາກ ປະ ຢັດ: ຖອນ ໄດ້ ແຕ່ ຕ້ອງ ເຫຼືອ ≥ minimum_balance
 * BR-W4: ຝາກ ປະ ຈຳ: ຖ້າ ບໍ່ ຄົບ term → ຄ່າ ທຳ ນຽມ 1% ຂອງ ຍອດ ຖອນ
 * BR-W5: ຝາກ ປະ ຈຳ: ຖ້າ ຄົບ term → ຖອນ ປົກ ກະ ຕິ + ຈ່າຍ ດອກ ເບ້ຍ
 * BR-W7: Auto JE: Dr ເງິນ ຝາກ ລູກ ຄ້າ / Cr ເງິນ ສົດ
 *
 * BR-I1: ຝາກ ປະ ຢັດ: ດອກ ເບ້ຍ ລາຍ ເດືອນ = balance × (rate/100) / 12
 * BR-I2: ຝາກ ປະ ຈຳ: ດອກ ເບ້ຍ ຄົບ term = balance × (rate/100) × (term/12)
 * BR-I4: JE: Dr ຄ່າ ໃຊ້ ຈ່າຍ ດອກ ເບ້ຍ / Cr ເງິນ ຝາກ ລູກ ຄ້າ
 *
 * BR-C1: ປິດ ບັນ ຊີ → balance ຕ້ອງ = 0
 * BR-C2: ຈ່າຍ ດອກ ເບ້ຍ ຄ້າງ ກ່ອນ ປິດ
 * BR-C5: ປິດ ແລ້ວ ບໍ່ ສາ ມາດ ເປີດ ຄືນ
 * ══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { Sequelize, QueryTypes } = require('sequelize');

const db = require('../models');
const sequelize = db.sequelize;
const { requirePermission } = require('../middleware/rbac');
const accountingEngine = require('../engines/accountingEngine');

// ══════════════════════════════════════
// HELPERS — ຟັງຊັນ ຊ່ວຍ ເຫຼືອ
// ══════════════════════════════════════

/**
 * ສ້າງ ເລກ ບັນ ຊີ ຕາມ ມາດ ຕະ ຖານ MFI ລາວ: BBB-PP-NNNNNNN
 * BBB = ລະ ຫັດ ສາ ຂາ (001)
 * PP  = ລະ ຫັດ ຜະ ລິດ ຕະ ພັນ (01-99)
 * NNNNNNN = ລຳ ດັບ (7 ຕົວ ເລກ)
 */
async function generateAccountNo(productId, branchCode = '001') {
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
 * ດຶງ ຂໍ້ ມູນ ຜະ ລິດ ຕະ ພັນ ເງິນ ຝາກ
 */
async function getProduct(productId) {
    const [product] = await sequelize.query(
        `SELECT * FROM deposit_products WHERE id = :id`,
        { replacements: { id: productId }, type: QueryTypes.SELECT }
    );
    return product;
}

/**
 * ກວດ ວ່າ ຝາກ ປະ ຈຳ ຄົບ ກຳ ນົດ ແລ້ວ ຫຼື ຍັງ
 * ຄືນ: { isFixed, isMatured, daysRemaining, monthsElapsed }
 */
function checkTermStatus(product, openingDate) {
    const termMonths = parseInt(product.term_months) || 0;
    // ຖ້າ term_months = 0 → ເປັນ ເງິນ ຝາກ ປະ ຢັດ (ບໍ່ ມີ ກຳ ນົດ)
    if (termMonths === 0) {
        return { isFixed: false, isMatured: false, daysRemaining: 0, monthsElapsed: 0 };
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
        isFixed: true,                     // ເປັນ ຝາກ ປະ ຈຳ
        isMatured: daysRemaining <= 0,     // ຄົບ ກຳ ນົດ ແລ້ວ ຫຼື ຍັງ
        daysRemaining,                     // ຍັງ ເຫຼືອ ຈັກ ມື້
        monthsElapsed,                     // ຜ່ານ ມາ ຈັກ ເດືອນ
        maturityDate,                      // ວັນ ຄົບ ກຳ ນົດ
    };
}

/**
 * ຄິດ ໄລ່ ດອກ ເບ້ຍ
 * - ຝາກ ປະ ຢັດ: balance × (rate/100) / 12 (ລາຍ ເດືອນ)
 * - ຝາກ ປະ ຈຳ: balance × (rate/100) × (termMonths/12) (ຄົບ term)
 */
function calculateInterest(balance, interestRate, termMonths, monthsElapsed = 1) {
    const rate = parseFloat(interestRate) / 100;
    if (termMonths === 0) {
        // ຝາກ ປະ ຢັດ — ດອກ ເບ້ຍ ລາຍ ເດືອນ × ຈຳ ນວນ ເດືອນ ທີ່ ຄ້າງ
        return parseFloat((balance * rate / 12 * monthsElapsed).toFixed(2));
    } else {
        // ຝາກ ປະ ຈຳ — ດອກ ເບ້ຍ ຕາມ ໄລ ຍະ ເວ ລາ
        return parseFloat((balance * rate * (termMonths / 12)).toFixed(2));
    }
}

// ══════════════════════════════════════
// GET /deposit_products — ລາຍ ການ ຜະ ລິດ ຕະ ພັນ ເງິນ ຝາກ
// ══════════════════════════════════════
router.get('/deposit_products', async (req, res) => {
    try {
        const products = await sequelize.query(
            `SELECT * FROM deposit_products ORDER BY id ASC`,
            { type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// GET /deposit-accounts — ລາຍ ການ ບັນ ຊີ ທັງ ໝົດ
// ══════════════════════════════════════
router.get('/deposit-accounts', async (req, res) => {
    try {
        const accounts = await sequelize.query(
            `SELECT 
                da.id, da.account_no, da.product_id, da.currency_id,
                da.opening_date, da.account_status, da.current_balance,
                da.accrued_interest, da.created_at,
                dp.product_name_la AS product_name,
                dp.product_name_en,
                dp.interest_rate,
                dp.minimum_balance,
                dp.term_months,
                COALESCE(pi.firstname_la || ' ' || pi.lastname_la, 'N/A') AS owner_name,
                pi.id AS person_id
             FROM deposit_accounts da
             LEFT JOIN deposit_products dp ON dp.id = da.product_id
             LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
             LEFT JOIN personal_infos pi ON pi.id = dao.person_id
             ORDER BY da.created_at DESC`,
            { type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: accounts });
    } catch (err) {
        console.error('GET /deposit-accounts error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// GET /deposit-accounts/:id — ລາຍ ລະ ອຽດ ບັນ ຊີ
// ══════════════════════════════════════
router.get('/deposit-accounts/:id', async (req, res) => {
    try {
        const [account] = await sequelize.query(
            `SELECT 
                da.*, 
                dp.product_name_la AS product_name,
                dp.interest_rate,
                dp.minimum_balance,
                dp.term_months,
                COALESCE(pi.firstname_la || ' ' || pi.lastname_la, 'N/A') AS owner_name,
                pi.id AS person_id
             FROM deposit_accounts da
             LEFT JOIN deposit_products dp ON dp.id = da.product_id
             LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
             LEFT JOIN personal_infos pi ON pi.id = dao.person_id
             WHERE da.id = :id`,
            { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
        );
        if (!account) return res.status(404).json({ success: false, message: 'ບໍ່ພົບບັນຊີ' });

        // ເພີ່ມ ຂໍ້ ມູນ term status
        const termStatus = checkTermStatus(
            { term_months: account.term_months },
            account.opening_date || account.created_at
        );

        // ຄິດ ໄລ່ ດອກ ເບ້ຍ ສະ ສົມ
        const accruedInterest = calculateInterest(
            parseFloat(account.current_balance),
            account.interest_rate,
            parseInt(account.term_months) || 0,
            termStatus.monthsElapsed || 1
        );

        res.json({
            success: true,
            data: {
                ...account,
                term_status: termStatus,
                calculated_interest: accruedInterest,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// POST /deposit-accounts/open — ເປີດ ບັນ ຊີ ໃໝ່
// ══════════════════════════════════════
// BR-O1: ຕ້ອງ ມີ person_id + product_id
// BR-O3: ຖ້າ ຝາກ ເງິນ ເປີດ → ຕ້ອງ ≥ minimum_balance
// BR-O4: ເລກ ບັນ ຊີ auto
// ══════════════════════════════════════
router.post('/deposit-accounts/open', requirePermission('ສ້າງເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { person_id, product_id, currency_id = 1, initial_amount = 0 } = req.body;

        // BR-O1: ກວດ ຂໍ້ ມູນ ບັງ ຄັບ
        if (!person_id || !product_id) {
            return res.status(400).json({
                success: false,
                message: 'ກະລຸນາ ເລືອກ ລູກ ຄ້າ ແລະ ຜະ ລິດ ຕະ ພັນ'
            });
        }

        // ດຶງ ຂໍ້ ມູນ ຜະ ລິດ ຕະ ພັນ
        const product = await getProduct(product_id);
        if (!product) {
            return res.status(400).json({
                success: false,
                message: 'ບໍ່ ພົບ ຜະ ລິດ ຕະ ພັນ ເງິນ ຝາກ'
            });
        }

        // BR-O3: ກວດ minimum_balance ຖ້າ ມີ ເງິນ ຝາກ ເປີດ
        const minBalance = parseFloat(product.minimum_balance) || 0;
        if (initial_amount > 0 && initial_amount < minBalance) {
            return res.status(400).json({
                success: false,
                message: `ເງິນ ຝາກ ເປີດ ບັນ ຊີ ຕ້ອງ ≥ ${minBalance.toLocaleString()} ກີບ (ຂັ້ນ ຕ່ຳ ຂອງ ຜະ ລິດ ຕະ ພັນ ${product.product_name_la})`
            });
        }

        // BR-O4: ສ້າງ ເລກ ບັນ ຊີ
        const account_no = await generateAccountNo(product_id);

        // ສ້າງ ບັນ ຊີ
        const [accountResult] = await sequelize.query(
            `INSERT INTO deposit_accounts (account_no, product_id, currency_id, current_balance, opening_date)
             VALUES (:account_no, :product_id, :currency_id, :balance, NOW())
             RETURNING *`,
            {
                replacements: {
                    account_no,
                    product_id,
                    currency_id,
                    balance: initial_amount || 0,
                },
                type: QueryTypes.INSERT,
                transaction: t,
            }
        );

        const accountId = accountResult[0]?.id || accountResult[0];

        // ສ້າງ ການ ເຊື່ອມ ເຈົ້າ ຂອງ
        await sequelize.query(
            `INSERT INTO deposit_account_owners (account_id, person_id) VALUES (:account_id, :person_id)`,
            { replacements: { account_id: accountId, person_id }, transaction: t }
        );

        // ຖ້າ ມີ ເງິນ ຝາກ ເປີດ → ບັນ ທຶກ transaction + JE
        if (initial_amount > 0) {
            await sequelize.query(
                `INSERT INTO deposit_transactions 
                    (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                 VALUES (:account_id, 'DEPOSIT', :amount, :balance, :ref, 'ເງິນ ຝາກ ເປີດ ບັນ ຊີ')`,
                {
                    replacements: {
                        account_id: accountId,
                        amount: initial_amount,
                        balance: initial_amount,
                        ref: `DEP-OPEN-${account_no}`,
                    },
                    transaction: t,
                }
            );

            // Auto JE: Dr ເງິນ ສົດ / Cr ເງິນ ຝາກ ລູກ ຄ້າ
            try {
                await accountingEngine.createJournalEntry({
                    templateName: 'DEPOSIT_RECEIVED',
                    amountData: { total: initial_amount },
                    description: `ເງິນ ຝາກ ເປີດ ບັນ ຊີ ${account_no}`,
                    referenceNo: `DEP-OPEN-${account_no}`,
                    userId: 2,
                });
            } catch (jeErr) {
                console.warn('⚠️ Auto-JE ບໍ່ ສຳ ເລັດ (ບໍ່ ກະ ທົບ ການ ເປີດ ບັນ ຊີ):', jeErr.message);
            }
        }

        await t.commit();
        res.json({
            success: true,
            data: { id: accountId, account_no },
            message: `ເປີດ ບັນ ຊີ ສຳ ເລັດ: ${account_no} (${product.product_name_la})`
        });
    } catch (err) {
        await t.rollback();
        console.error('POST /deposit-accounts/open error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// POST /deposit-accounts/:id/deposit — ຝາກ ເງິນ
// ══════════════════════════════════════
// BR-D1: ບັນ ຊີ ຕ້ອງ ACTIVE
// BR-D2: ຈຳ ນວນ ຕ້ອງ > 0
// BR-D6: Auto JE
// ══════════════════════════════════════
router.post('/deposit-accounts/:id/deposit', requirePermission('ສ້າງເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { amount, remarks = '' } = req.body;
        const accountId = req.params.id;

        // BR-D2: ກວດ ຈຳ ນວນ ເງິນ
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ຈຳ ນວນ ເງິນ ຝາກ ຕ້ອງ > 0'
            });
        }

        // BR-D1: ກວດ ບັນ ຊີ ACTIVE
        const [updated] = await sequelize.query(
            `UPDATE deposit_accounts 
             SET current_balance = current_balance + :amount, updated_at = NOW()
             WHERE id = :id AND account_status = 'ACTIVE'
             RETURNING account_no, current_balance`,
            { replacements: { amount, id: accountId }, type: QueryTypes.UPDATE, transaction: t }
        );

        if (!updated || updated.length === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'ບໍ່ ພົບ ບັນ ຊີ ຫຼື ບັນ ຊີ ບໍ່ active'
            });
        }

        const newBalance = updated[0].current_balance;
        const accountNo = updated[0].account_no;

        // ບັນ ທຶກ transaction
        await sequelize.query(
            `INSERT INTO deposit_transactions 
                (account_id, transaction_type, amount, balance_after, reference_no, remarks)
             VALUES (:account_id, 'DEPOSIT', :amount, :balance, :ref, :remarks)`,
            {
                replacements: {
                    account_id: accountId,
                    amount,
                    balance: newBalance,
                    ref: `DEP-${accountNo}-${Date.now()}`,
                    remarks: remarks || 'ຝາກ ເງິນ',
                },
                transaction: t,
            }
        );

        // BR-D6: Auto JE — Dr ເງິນ ສົດ / Cr ເງິນ ຝາກ ລູກ ຄ້າ
        try {
            await accountingEngine.createJournalEntry({
                templateName: 'DEPOSIT_RECEIVED',
                amountData: { total: amount },
                description: `ຝາກ ເງິນ ${accountNo} ຈຳ ນວນ ${Number(amount).toLocaleString()} ກີບ`,
                referenceNo: `DEP-${accountNo}-${Date.now()}`,
                userId: 2,
            });
        } catch (jeErr) {
            console.warn('⚠️ Auto-JE ຝາກ ເງິນ ບໍ່ ສຳ ເລັດ:', jeErr.message);
        }

        await t.commit();
        res.json({
            success: true,
            data: { balance: newBalance },
            message: `ຝາກ ເງິນ ສຳ ເລັດ ${Number(amount).toLocaleString()} ກີບ — ຍອດ ໃໝ່: ${Number(newBalance).toLocaleString()} ກີບ`
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// POST /deposit-accounts/:id/withdraw — ຖອນ ເງິນ
// ══════════════════════════════════════
// BR-W1: ບັນ ຊີ ຕ້ອງ ACTIVE
// BR-W2: ຈຳ ນວນ ຕ້ອງ > 0
// BR-W3: ເງິນ ຝາກ ປະ ຢັດ: ເຫຼືອ ≥ minimum_balance
// BR-W4: ຝາກ ປະ ຈຳ ບໍ່ ຄົບ term → ຄ່າ ທຳ ນຽມ 1%
// BR-W5: ຝາກ ປະ ຈຳ ຄົບ term → ຖອນ + ດອກ ເບ້ຍ
// BR-W7: Auto JE
// ══════════════════════════════════════
router.post('/deposit-accounts/:id/withdraw', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { amount, remarks = '' } = req.body;
        const accountId = req.params.id;

        // BR-W2: ກວດ ຈຳ ນວນ
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ຈຳ ນວນ ເງິນ ຖອນ ຕ້ອງ > 0'
            });
        }

        // BR-W1: ດຶງ ຂໍ້ ມູນ ບັນ ຊີ + ຜະ ລິດ ຕະ ພັນ
        const [account] = await sequelize.query(
            `SELECT da.account_no, da.current_balance, da.opening_date, da.created_at,
                    dp.minimum_balance, dp.term_months, dp.interest_rate,
                    dp.product_name_la
             FROM deposit_accounts da
             LEFT JOIN deposit_products dp ON dp.id = da.product_id
             WHERE da.id = :id AND da.account_status = 'ACTIVE'`,
            { replacements: { id: accountId }, type: QueryTypes.SELECT }
        );

        if (!account) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'ບໍ່ ພົບ ບັນ ຊີ ຫຼື ບັນ ຊີ ບໍ່ active'
            });
        }

        const currentBalance = parseFloat(account.current_balance);
        const minBalance = parseFloat(account.minimum_balance) || 0;
        const termMonths = parseInt(account.term_months) || 0;

        // ກວດ ສະ ຖາ ນະ ກຳ ນົດ ເວ ລາ (ຝາກ ປະ ຈຳ)
        const termStatus = checkTermStatus(
            { term_months: termMonths },
            account.opening_date || account.created_at
        );

        let earlyWithdrawalFee = 0;
        let interestPayout = 0;
        let warningMessage = '';

        if (termStatus.isFixed) {
            // ═══ ຝາກ ປະ ຈຳ ═══
            if (!termStatus.isMatured) {
                // BR-W4: ຖອນ ກ່ອນ ກຳ ນົດ → ຄ່າ ທຳ ນຽມ 1%
                earlyWithdrawalFee = parseFloat((amount * 0.01).toFixed(2));
                warningMessage = `⚠️ ຖອນ ກ່ອນ ກຳ ນົດ (ເຫຼືອ ${termStatus.daysRemaining} ມື້) — ຄ່າ ທຳ ນຽມ 1% = ${earlyWithdrawalFee.toLocaleString()} ກີບ`;
            } else {
                // BR-W5: ຄົບ ກຳ ນົດ → ຈ່າຍ ດອກ ເບ້ຍ
                interestPayout = calculateInterest(
                    currentBalance,
                    account.interest_rate,
                    termMonths
                );
                warningMessage = `✅ ຄົບ ກຳ ນົດ ແລ້ວ — ດອກ ເບ້ຍ ${interestPayout.toLocaleString()} ກີບ`;
            }
        }

        // BR-W3: ກວດ minimum_balance (ເງິນ ຝາກ ປະ ຢັດ)
        const totalDeduction = amount + earlyWithdrawalFee;
        const balanceAfter = currentBalance - totalDeduction + interestPayout;

        if (totalDeduction > currentBalance) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `ຍອດ ເງິນ ບໍ່ ພຽງ ພໍ. ຍອດ ປັດ ຈຸ ບັນ: ${currentBalance.toLocaleString()} ກີບ, ຕ້ອງ ການ: ${totalDeduction.toLocaleString()} ກີບ (ລວມ ຄ່າ ທຳ ນຽມ)`
            });
        }

        if (!termStatus.isFixed && balanceAfter < minBalance && balanceAfter > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `ຖອນ ບໍ່ ໄດ້ — ຍອດ ເຫຼືອ ຕ້ອງ ≥ ${minBalance.toLocaleString()} ກີບ (ຂັ້ນ ຕ່ຳ ຂອງ ${account.product_name_la}). ສາ ມາດ ຖອນ ໄດ້ ສູງ ສຸດ: ${(currentBalance - minBalance).toLocaleString()} ກີບ`
            });
        }

        // ═══ ອັບ ເດດ ຍອດ ═══
        const [updated] = await sequelize.query(
            `UPDATE deposit_accounts 
             SET current_balance = current_balance - :totalDeduction + :interestPayout, updated_at = NOW()
             WHERE id = :id
             RETURNING current_balance`,
            {
                replacements: { totalDeduction, interestPayout, id: accountId },
                type: QueryTypes.UPDATE,
                transaction: t,
            }
        );

        const newBalance = updated[0].current_balance;

        // ═══ ບັນ ທຶກ transaction ຖອນ ═══
        await sequelize.query(
            `INSERT INTO deposit_transactions 
                (account_id, transaction_type, amount, balance_after, reference_no, remarks)
             VALUES (:account_id, 'WITHDRAWAL', :amount, :balance, :ref, :remarks)`,
            {
                replacements: {
                    account_id: accountId,
                    amount,
                    balance: newBalance,
                    ref: `WDR-${account.account_no}-${Date.now()}`,
                    remarks: remarks || 'ຖອນ ເງິນ',
                },
                transaction: t,
            }
        );

        // ═══ ບັນ ທຶກ ຄ່າ ທຳ ນຽມ (ຖ້າ ມີ) ═══
        if (earlyWithdrawalFee > 0) {
            await sequelize.query(
                `INSERT INTO deposit_transactions 
                    (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                 VALUES (:account_id, 'FEE', :amount, :balance, :ref, 'ຄ່າ ທຳ ນຽມ ຖອນ ກ່ອນ ກຳ ນົດ 1%')`,
                {
                    replacements: {
                        account_id: accountId,
                        amount: earlyWithdrawalFee,
                        balance: newBalance,
                        ref: `FEE-${account.account_no}-${Date.now()}`,
                    },
                    transaction: t,
                }
            );

            // JE ຄ່າ ທຳ ນຽມ: Dr ເງິນ ຝາກ ລູກ ຄ້າ / Cr ລາຍ ຮັບ ຄ່າ ທຳ ນຽມ
            try {
                await accountingEngine.createJournalEntry({
                    templateName: 'FEE_INCOME',
                    amountData: { total: earlyWithdrawalFee },
                    description: `ຄ່າ ທຳ ນຽມ ຖອນ ກ່ອນ ກຳ ນົດ ${account.account_no}`,
                    referenceNo: `FEE-${account.account_no}-${Date.now()}`,
                    userId: 2,
                });
            } catch (jeErr) {
                console.warn('⚠️ Auto-JE ຄ່າ ທຳ ນຽມ ບໍ່ ສຳ ເລັດ:', jeErr.message);
            }
        }

        // ═══ ບັນ ທຶກ ດອກ ເບ້ຍ ຈ່າຍ (ຖ້າ ມີ) ═══
        if (interestPayout > 0) {
            await sequelize.query(
                `INSERT INTO deposit_transactions 
                    (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                 VALUES (:account_id, 'INTEREST', :amount, :balance, :ref, 'ດອກ ເບ້ຍ ຝາກ ປະ ຈຳ ຄົບ ກຳ ນົດ')`,
                {
                    replacements: {
                        account_id: accountId,
                        amount: interestPayout,
                        balance: newBalance,
                        ref: `INT-${account.account_no}-${Date.now()}`,
                    },
                    transaction: t,
                }
            );

            // JE ດອກ ເບ້ຍ: Dr ຄ່າ ໃຊ້ ຈ່າຍ ດອກ ເບ້ຍ / Cr ເງິນ ຝາກ ລູກ ຄ້າ
            try {
                await accountingEngine.createJournalEntry({
                    templateName: 'INTEREST_EXPENSE',
                    amountData: { total: interestPayout },
                    description: `ດອກ ເບ້ຍ ຝາກ ປະ ຈຳ ${account.account_no}`,
                    referenceNo: `INT-${account.account_no}-${Date.now()}`,
                    userId: 2,
                });
            } catch (jeErr) {
                console.warn('⚠️ Auto-JE ດອກ ເບ້ຍ ບໍ່ ສຳ ເລັດ:', jeErr.message);
            }
        }

        // BR-W7: Auto JE ຖອນ ເງິນ — Dr ເງິນ ຝາກ ລູກ ຄ້າ / Cr ເງິນ ສົດ
        try {
            await accountingEngine.createJournalEntry({
                templateName: 'DEPOSIT_WITHDRAWAL',
                amountData: { total: amount },
                description: `ຖອນ ເງິນ ${account.account_no} ຈຳ ນວນ ${Number(amount).toLocaleString()} ກີບ`,
                referenceNo: `WDR-${account.account_no}-${Date.now()}`,
                userId: 2,
            });
        } catch (jeErr) {
            console.warn('⚠️ Auto-JE ຖອນ ເງິນ ບໍ່ ສຳ ເລັດ:', jeErr.message);
        }

        await t.commit();
        res.json({
            success: true,
            data: {
                balance: newBalance,
                earlyWithdrawalFee,
                interestPayout,
            },
            message: `ຖອນ ເງິນ ສຳ ເລັດ ${Number(amount).toLocaleString()} ກີບ` +
                (earlyWithdrawalFee > 0 ? ` | ຄ່າ ທຳ ນຽມ: ${earlyWithdrawalFee.toLocaleString()} ກີບ` : '') +
                (interestPayout > 0 ? ` | ດອກ ເບ້ຍ: ${interestPayout.toLocaleString()} ກີບ` : '') +
                ` | ຍອດ ເຫຼືອ: ${Number(newBalance).toLocaleString()} ກີບ`
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// POST /deposit-accounts/:id/calculate-interest — ຄິດ ໄລ່ ດອກ ເບ້ຍ
// ══════════════════════════════════════
// BR-I1: ຝາກ ປະ ຢັດ — ດອກ ເບ້ຍ ລາຍ ເດືອນ
// BR-I2: ຝາກ ປະ ຈຳ — ດອກ ເບ້ຍ ຄົບ term
// BR-I4: Auto JE — Dr ຄ່າ ໃຊ້ ຈ່າຍ ດອກ ເບ້ຍ / Cr ເງິນ ຝາກ ລູກ ຄ້າ
// ══════════════════════════════════════
router.post('/deposit-accounts/:id/calculate-interest', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const accountId = req.params.id;

        // ດຶງ ຂໍ້ ມູນ ບັນ ຊີ + product
        const [account] = await sequelize.query(
            `SELECT da.*, dp.interest_rate, dp.term_months, dp.product_name_la
             FROM deposit_accounts da
             LEFT JOIN deposit_products dp ON dp.id = da.product_id
             WHERE da.id = :id AND da.account_status = 'ACTIVE'`,
            { replacements: { id: accountId }, type: QueryTypes.SELECT }
        );

        if (!account) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'ບໍ່ ພົບ ບັນ ຊີ ຫຼື ບໍ່ active' });
        }

        const balance = parseFloat(account.current_balance);
        const termMonths = parseInt(account.term_months) || 0;
        const termStatus = checkTermStatus(
            { term_months: termMonths },
            account.opening_date || account.created_at
        );

        // ຄິດ ໄລ່ ດອກ ເບ້ຍ
        const interest = calculateInterest(
            balance,
            account.interest_rate,
            termMonths,
            termStatus.monthsElapsed || 1
        );

        if (interest <= 0) {
            await t.rollback();
            return res.json({
                success: true,
                data: { interest: 0, message: 'ບໍ່ ມີ ດອກ ເບ້ຍ ທີ່ ຕ້ອງ ຈ່າຍ' }
            });
        }

        // ເພີ່ມ ດອກ ເບ້ຍ ເຂົ້າ ບັນ ຊີ
        await sequelize.query(
            `UPDATE deposit_accounts 
             SET current_balance = current_balance + :interest,
                 accrued_interest = COALESCE(accrued_interest, 0) + :interest,
                 updated_at = NOW()
             WHERE id = :id`,
            { replacements: { interest, id: accountId }, transaction: t }
        );

        // ບັນ ທຶກ transaction ດອກ ເບ້ຍ
        await sequelize.query(
            `INSERT INTO deposit_transactions 
                (account_id, transaction_type, amount, balance_after, reference_no, remarks)
             VALUES (:account_id, 'INTEREST', :amount, :balance, :ref, :remarks)`,
            {
                replacements: {
                    account_id: accountId,
                    amount: interest,
                    balance: balance + interest,
                    ref: `INT-${account.account_no}-${Date.now()}`,
                    remarks: termMonths === 0
                        ? `ດອກ ເບ້ຍ ປະ ຢັດ ລາຍ ເດືອນ (${account.interest_rate}%/ປີ)`
                        : `ດອກ ເບ້ຍ ຝາກ ປະ ຈຳ ${termMonths} ເດືອນ (${account.interest_rate}%/ປີ)`,
                },
                transaction: t,
            }
        );

        // BR-I4: Auto JE — Dr ຄ່າ ໃຊ້ ຈ່າຍ ດອກ ເບ້ຍ / Cr ເງິນ ຝາກ ລູກ ຄ້າ
        try {
            await accountingEngine.createJournalEntry({
                templateName: 'INTEREST_EXPENSE',
                amountData: { total: interest },
                description: `ດອກ ເບ້ຍ ${account.product_name_la} ${account.account_no}`,
                referenceNo: `INT-${account.account_no}-${Date.now()}`,
                userId: 2,
            });
        } catch (jeErr) {
            console.warn('⚠️ Auto-JE ດອກ ເບ້ຍ ບໍ່ ສຳ ເລັດ:', jeErr.message);
        }

        await t.commit();
        res.json({
            success: true,
            data: {
                interest,
                newBalance: balance + interest,
                interestRate: account.interest_rate,
                productName: account.product_name_la,
            },
            message: `ຄິດ ດອກ ເບ້ຍ ສຳ ເລັດ: ${interest.toLocaleString()} ກີບ (${account.interest_rate}%/ປີ)`
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// GET /deposit-accounts/:id/statement — ປະ ຫວັດ ການ ເຄື່ອນ ໄຫວ
// ══════════════════════════════════════
router.get('/deposit-accounts/:id/statement', async (req, res) => {
    try {
        const transactions = await sequelize.query(
            `SELECT * FROM deposit_transactions 
             WHERE account_id = :id
             ORDER BY transaction_date DESC`,
            { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════
// POST /deposit-accounts/:id/close — ປິດ ບັນ ຊີ
// ══════════════════════════════════════
// BR-C1: balance ຕ້ອງ = 0
// BR-C2: ຈ່າຍ ດອກ ເບ້ຍ ຄ້າງ ກ່ອນ
// BR-C5: ປິດ ແລ້ວ ບໍ່ ເປີດ ຄືນ
// ══════════════════════════════════════
router.post('/deposit-accounts/:id/close', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const accountId = req.params.id;

        // ດຶງ ຂໍ້ ມູນ ບັນ ຊີ + product
        const [account] = await sequelize.query(
            `SELECT da.*, dp.interest_rate, dp.term_months, dp.product_name_la
             FROM deposit_accounts da
             LEFT JOIN deposit_products dp ON dp.id = da.product_id
             WHERE da.id = :id AND da.account_status = 'ACTIVE'`,
            { replacements: { id: accountId }, type: QueryTypes.SELECT }
        );

        if (!account) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'ບໍ່ ພົບ ບັນ ຊີ ຫຼື ບັນ ຊີ ຖືກ ປິດ ແລ້ວ'
            });
        }

        const balance = parseFloat(account.current_balance);

        // BR-C2: ຄິດ ດອກ ເບ້ຍ ຄ້າງ ກ່ອນ ປິດ
        const termMonths = parseInt(account.term_months) || 0;
        const termStatus = checkTermStatus(
            { term_months: termMonths },
            account.opening_date || account.created_at
        );

        let interestPayout = 0;
        if (balance > 0) {
            interestPayout = calculateInterest(
                balance,
                account.interest_rate,
                termMonths,
                termStatus.monthsElapsed || 1
            );
        }

        // BR-C1: ຍອດ ຕ້ອງ = 0 (ຫຼື ຜູ້ ໃຊ້ ຕ້ອງ ຖອນ ໃຫ້ ໝົດ ກ່ອນ)
        if (balance > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `ຕ້ອງ ຖອນ ເງິນ ໃຫ້ ໝົດ ກ່ອນ ປິດ ບັນ ຊີ. ຍອດ ຄ້າງ: ${balance.toLocaleString()} ກີບ` +
                    (interestPayout > 0 ? ` + ດອກ ເບ້ຍ ຄ້າງ: ${interestPayout.toLocaleString()} ກີບ` : '')
            });
        }

        // BR-C5: ປ່ຽນ status → CLOSED
        await sequelize.query(
            `UPDATE deposit_accounts SET account_status = 'CLOSED', updated_at = NOW() WHERE id = :id`,
            { replacements: { id: accountId }, transaction: t }
        );

        // ບັນ ທຶກ transaction ປິດ ບັນ ຊີ
        await sequelize.query(
            `INSERT INTO deposit_transactions 
                (account_id, transaction_type, amount, balance_after, reference_no, remarks)
             VALUES (:account_id, 'CLOSE', 0, 0, :ref, 'ປິດ ບັນ ຊີ')`,
            {
                replacements: {
                    account_id: accountId,
                    ref: `CLS-${account.account_no}-${Date.now()}`,
                },
                transaction: t,
            }
        );

        await t.commit();
        res.json({
            success: true,
            message: `ປິດ ບັນ ຊີ ${account.account_no} ສຳ ເລັດ`
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
