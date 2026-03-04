/**
 * deposit-operations.routes.js — ທຸລະກຳເງິນຝາກ: ຝາກ / ຖອນ / ປິດ / ຍ້າຍ
 *
 * Endpoints:
 *   POST /api/deposit-operations/deposit    — ຝາກເງິນ
 *   POST /api/deposit-operations/withdraw   — ຖອນເງິນ
 *   POST /api/deposit-operations/close      — ປິດບັນຊີ
 *   POST /api/deposit-operations/transfer   — ຍ້າຍບັນຊີ
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;
const { requirePermission } = require('../middleware/rbac');

// ═══════════════════════════════════════════
// COA Mapping — product_id → COA IDs
// ═══════════════════════════════════════════
const DEPOSIT_COA = {
    1: { depositId: 1008, code: '213113', name: 'ເງິນຝາກປະຢັດ' },
    2: { depositId: 1010, code: '213115', name: 'ເງິນຝາກມີກຳນົດ' },
    3: { depositId: 1010, code: '213115', name: 'ເງິນຝາກມີກຳນົດ' },
    4: { depositId: 1007, code: '213111', name: 'ເງິນຝາກກະແສລາຍວັນ' },
};
const INTEREST_LIABILITY_COA = {
    1: 2109, 2: 2110, 3: 2110, 4: 2108,
};
const CASH_COA_ID = 3;    // 11011
const WHT_RATE = 0.10;
let WHT_COA_ID = null;

// Resolve WHT COA on startup
(async () => {
    const [rows] = await sequelize.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '236113'`
    );
    WHT_COA_ID = rows.length ? rows[0].id : null;
})();

// ── Helper: get branch info ──
async function getBranch(t) {
    const [rows] = await sequelize.query(
        `SELECT id, org_code FROM org_branches WHERE code = 'HQ' LIMIT 1`,
        { transaction: t }
    );
    return {
        branchId: rows.length ? String(rows[0].id) : null,
        orgCode: rows.length ? rows[0].org_code : 'MFI-001',
    };
}

// ── Helper: unique ref suffix ──
function refSuffix() {
    return String(Date.now()).slice(-6);
}

// ── Helper: create JE with lines ──
async function createJE(t, { ref, date, amount, desc, module, branchId, orgCode, lines }) {
    const [jeResult] = await sequelize.query(`
        INSERT INTO journal_entries
            (reference_no, transaction_date, currency_code, total_debit, total_credit,
             status, description, source_module, branch_id, org_code)
        VALUES (:ref, :date, 'LAK', :amt, :amt, 'POSTED', :desc, :module, :branchId, :orgCode)
        RETURNING id
    `, { replacements: { ref, date, amt: amount, desc, module, branchId, orgCode }, transaction: t });
    const jeId = jeResult[0].id;

    for (const line of lines) {
        await sequelize.query(`
            INSERT INTO journal_entry_lines
                (journal_entry_id, account_id, description, debit, credit, branch_id)
            VALUES (:jeId, :accId, :desc, :dr, :cr, :branchId)
        `, {
            replacements: {
                jeId, accId: line.accountId, desc: line.desc,
                dr: line.debit || 0, cr: line.credit || 0, branchId,
            },
            transaction: t,
        });
    }
    return jeId;
}

// ═══════════════════════════════════════════
// ① POST /api/deposit-operations/deposit — ຝາກເງິນ
// ═══════════════════════════════════════════
router.post('/deposit-operations/deposit', requirePermission('ສ້າງເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { accountId, amount, remark } = req.body;
        if (!accountId || !amount || amount <= 0) {
            throw new Error('ກະລຸນາລະບຸ accountId ແລະ amount > 0');
        }

        // Get account
        const [accounts] = await sequelize.query(
            `SELECT da.*, dp.term_months, dp.product_name_la
             FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
             WHERE da.id = :id`, { replacements: { id: accountId }, transaction: t }
        );
        if (!accounts.length) throw new Error('ບໍ່ພົບບັນຊີ');
        const acc = accounts[0];

        if (acc.account_status !== 'ACTIVE') throw new Error('ບັນຊີບໍ່ active');
        if (acc.term_months > 0) throw new Error('ບັນຊີປະຈຳ ບໍ່ອະນຸຍາດ ຝາກເພີ່ມ');

        const newBalance = parseFloat(acc.current_balance) + amount;
        const coaMap = DEPOSIT_COA[acc.product_id];
        const { branchId, orgCode } = await getBranch(t);
        const today = new Date().toISOString().split('T')[0];

        // JE: Dr Cash / Cr Deposit
        const jeId = await createJE(t, {
            ref: `DIN-${acc.account_no}-${refSuffix()}`,
            date: today, amount, desc: `ຝາກເງິນ ${acc.account_no}: ${amount}`,
            module: 'DEPOSIT_IN', branchId, orgCode,
            lines: [
                { accountId: CASH_COA_ID, desc: 'ຮັບເງິນສົດ', debit: amount, credit: 0 },
                { accountId: coaMap.depositId, desc: `ຝາກເຂົ້າ ${acc.account_no}`, debit: 0, credit: amount },
            ],
        });

        // Update balance
        await sequelize.query(
            `UPDATE deposit_accounts SET current_balance = :bal, updated_at = NOW() WHERE id = :id`,
            { replacements: { bal: newBalance, id: accountId }, transaction: t }
        );

        // Transaction record
        await sequelize.query(`
            INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
            VALUES (:accId, 'DEPOSIT', :amt, :bal, :ref, :remark)
        `, { replacements: { accId: accountId, amt: amount, bal: newBalance, ref: `DIN-${acc.account_no}-${today}`, remark: remark || 'ຝາກເງິນ' }, transaction: t });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ຝາກເງິນ ${acc.account_no}: ${amount.toLocaleString()} ₭`,
            data: { accountNo: acc.account_no, amount, newBalance, jeId },
        });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// ② POST /api/deposit-operations/withdraw — ຖອນເງິນ
// ═══════════════════════════════════════════
router.post('/deposit-operations/withdraw', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { accountId, amount, remark } = req.body;
        if (!accountId || !amount || amount <= 0) {
            throw new Error('ກະລຸນາລະບຸ accountId ແລະ amount > 0');
        }

        const [accounts] = await sequelize.query(
            `SELECT da.*, dp.term_months, dp.minimum_balance, dp.early_penalty_rate,
                    dp.interest_rate, dp.product_name_la
             FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
             WHERE da.id = :id`, { replacements: { id: accountId }, transaction: t }
        );
        if (!accounts.length) throw new Error('ບໍ່ພົບບັນຊີ');
        const acc = accounts[0];

        if (acc.account_status !== 'ACTIVE') throw new Error('ບັນຊີບໍ່ active');

        const balance = parseFloat(acc.current_balance);
        const minBal = parseFloat(acc.minimum_balance || 0);

        // Check minimum balance
        if (balance - amount < minBal) {
            throw new Error(`ຍອດຫຼັງຖອນ (${(balance - amount).toLocaleString()}) ຕ່ຳກ່ວາ ຂັ້ນຕ່ຳ (${minBal.toLocaleString()})`);
        }

        // Early withdrawal penalty for fixed-term
        let penalty = 0;
        if (acc.term_months > 0 && acc.maturity_date && new Date(acc.maturity_date) > new Date()) {
            const accrued = parseFloat(acc.accrued_interest || 0);
            const penaltyRate = parseFloat(acc.early_penalty_rate || 0) / 100;
            penalty = Math.round(accrued * penaltyRate * 100) / 100;
        }

        const netWithdraw = amount;
        const newBalance = balance - netWithdraw - penalty;
        if (newBalance < 0) throw new Error('ຍອດເງິນບໍ່ພຽງພໍ');

        const coaMap = DEPOSIT_COA[acc.product_id];
        const { branchId, orgCode } = await getBranch(t);
        const today = new Date().toISOString().split('T')[0];

        // JE: Dr Deposit / Cr Cash (+ penalty if any)
        const totalAmount = netWithdraw + penalty;
        const lines = [
            { accountId: coaMap.depositId, desc: `ຖອນ ${acc.account_no}`, debit: totalAmount, credit: 0 },
            { accountId: CASH_COA_ID, desc: 'ຈ່າຍເງິນສົດ', debit: 0, credit: netWithdraw },
        ];
        if (penalty > 0) {
            lines.push({ accountId: coaMap.depositId, desc: 'ປັບໂທດ ຖອນກ່ອນກຳນົດ', debit: 0, credit: penalty });
        }

        const jeId = await createJE(t, {
            ref: `WDR-${acc.account_no}-${refSuffix()}`,
            date: today, amount: totalAmount,
            desc: `ຖອນເງິນ ${acc.account_no}: ${amount}${penalty > 0 ? ` (penalty: ${penalty})` : ''}`,
            module: 'DEPOSIT_OUT', branchId, orgCode, lines,
        });

        // Update balance + penalty
        await sequelize.query(
            `UPDATE deposit_accounts SET current_balance = :bal, early_withdrawal_penalty = early_withdrawal_penalty + :penalty, updated_at = NOW() WHERE id = :id`,
            { replacements: { bal: newBalance, penalty, id: accountId }, transaction: t }
        );

        // Transaction record
        await sequelize.query(`
            INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
            VALUES (:accId, 'WITHDRAWAL', :amt, :bal, :ref, :remark)
        `, {
            replacements: {
                accId: accountId, amt: netWithdraw, bal: newBalance,
                ref: `WDR-${acc.account_no}-${refSuffix()}`,
                remark: remark || `ຖອນເງິນ${penalty > 0 ? ` (penalty: ${penalty})` : ''}`,
            },
            transaction: t,
        });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ຖອນເງິນ ${acc.account_no}: ${amount.toLocaleString()} ₭${penalty > 0 ? ` (penalty: ${penalty.toLocaleString()})` : ''}`,
            data: { accountNo: acc.account_no, amount: netWithdraw, penalty, newBalance, jeId },
        });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// ③ POST /api/deposit-operations/close — ປິດບັນຊີ
// ═══════════════════════════════════════════
router.post('/deposit-operations/close', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { accountId, reason, remark } = req.body;
        if (!accountId) throw new Error('ກະລຸນາລະບຸ accountId');

        const [accounts] = await sequelize.query(
            `SELECT da.*, dp.term_months, dp.early_penalty_rate, dp.interest_rate, dp.product_name_la
             FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
             WHERE da.id = :id`, { replacements: { id: accountId }, transaction: t }
        );
        if (!accounts.length) throw new Error('ບໍ່ພົບບັນຊີ');
        const acc = accounts[0];
        if (acc.account_status !== 'ACTIVE') throw new Error('ບັນຊີບໍ່ active');

        const balance = parseFloat(acc.current_balance);
        const accruedInterest = parseFloat(acc.accrued_interest || 0);
        const coaMap = DEPOSIT_COA[acc.product_id];
        const liabCoaId = INTEREST_LIABILITY_COA[acc.product_id];
        const { branchId, orgCode } = await getBranch(t);
        const today = new Date().toISOString().split('T')[0];

        // Early penalty for fixed-term
        let penalty = 0;
        if (acc.term_months > 0 && acc.maturity_date && new Date(acc.maturity_date) > new Date()) {
            penalty = Math.round(accruedInterest * (parseFloat(acc.early_penalty_rate || 0) / 100) * 100) / 100;
        }

        // Calculate payout
        const grossInterest = accruedInterest - penalty;
        const wht = grossInterest > 0 ? Math.round(grossInterest * WHT_RATE * 100) / 100 : 0;
        const netInterest = grossInterest - wht;
        const totalPayout = balance + (netInterest > 0 ? netInterest : 0);

        // Build JE lines
        const lines = [];
        // Dr: Deposit Liability (return principal)
        if (balance > 0) {
            lines.push({ accountId: coaMap.depositId, desc: 'ຄືນເງິນຕົ້ນ', debit: balance, credit: 0 });
        }
        // Dr: Interest Payable (accrued interest)
        if (accruedInterest > 0) {
            lines.push({ accountId: liabCoaId, desc: 'ດອກເບ້ຍຄ້າງຈ່າຍ', debit: accruedInterest, credit: 0 });
        }
        // Cr: Penalty (goes back to deposit)
        if (penalty > 0) {
            lines.push({ accountId: coaMap.depositId, desc: 'ປັບໂທດ ຖອນກ່ອນກຳນົດ', debit: 0, credit: penalty });
        }
        // Cr: WHT
        if (wht > 0 && WHT_COA_ID) {
            lines.push({ accountId: WHT_COA_ID, desc: 'ອາກອນ WHT 10%', debit: 0, credit: wht });
        }
        // Cr: Cash (net payout)
        if (totalPayout > 0) {
            lines.push({ accountId: CASH_COA_ID, desc: 'ຈ່າຍເງິນສົດ', debit: 0, credit: totalPayout });
        }

        const totalDebit = balance + accruedInterest;
        const jeId = await createJE(t, {
            ref: `CLS-${acc.account_no}-${refSuffix()}`,
            date: today, amount: totalDebit,
            desc: `ປິດບັນຊີ ${acc.account_no}: ຕົ້ນ ${balance} + ດອກເບ້ຍ ${netInterest}`,
            module: 'DEPOSIT_CLOSE', branchId, orgCode, lines,
        });

        // Close the account
        await sequelize.query(`
            UPDATE deposit_accounts SET
                account_status = 'CLOSED', current_balance = 0, accrued_interest = 0,
                closed_date = :today, closed_reason = :reason, early_withdrawal_penalty = :penalty,
                updated_at = NOW()
            WHERE id = :id
        `, { replacements: { today, reason: reason || 'VOLUNTARY', penalty, id: accountId }, transaction: t });

        // Transaction record
        await sequelize.query(`
            INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
            VALUES (:accId, 'CLOSE', :payout, 0, :ref, :remark)
        `, {
            replacements: {
                accId: accountId, payout: totalPayout,
                ref: `CLS-${acc.account_no}-${refSuffix()}`,
                remark: remark || `ປິດບັນຊີ: ຕົ້ນ ${balance} + ດອກ ${netInterest} - WHT ${wht} - penalty ${penalty}`,
            },
            transaction: t,
        });

        // Mark accruals as CLOSED
        await sequelize.query(
            `UPDATE deposit_interest_accruals SET status = 'CLOSED' WHERE account_id = :id AND status IN ('ACCRUED','PAID')`,
            { replacements: { id: accountId }, transaction: t }
        );

        await t.commit();
        res.json({
            status: true,
            message: `✅ ປິດບັນຊີ ${acc.account_no}: ຈ່າຍ ${totalPayout.toLocaleString()} ₭`,
            data: {
                accountNo: acc.account_no, principal: balance,
                grossInterest, penalty, wht, netInterest, totalPayout, jeId,
            },
        });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// ④ POST /api/deposit-operations/transfer — ຍ້າຍບັນຊີ
// ═══════════════════════════════════════════
router.post('/deposit-operations/transfer', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { fromAccountId, toAccountId, amount, remark } = req.body;
        if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
            throw new Error('ກະລຸນາລະບຸ fromAccountId, toAccountId, amount > 0');
        }
        if (fromAccountId === toAccountId) throw new Error('ບໍ່ສາມາດ ຍ້າຍ ໄປບັນຊີດຽວກັນ');

        // Get both accounts
        const [fromRows] = await sequelize.query(
            `SELECT da.*, dp.term_months, dp.minimum_balance, dp.product_name_la
             FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
             WHERE da.id = :id`, { replacements: { id: fromAccountId }, transaction: t }
        );
        const [toRows] = await sequelize.query(
            `SELECT da.*, dp.term_months, dp.product_name_la
             FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
             WHERE da.id = :id`, { replacements: { id: toAccountId }, transaction: t }
        );

        if (!fromRows.length) throw new Error('ບໍ່ພົບ ບັນຊີຕົ້ນທາງ');
        if (!toRows.length) throw new Error('ບໍ່ພົບ ບັນຊີປາຍທາງ');

        const from = fromRows[0];
        const to = toRows[0];

        if (from.account_status !== 'ACTIVE') throw new Error('ບັນຊີຕົ້ນທາງ ບໍ່ active');
        if (to.account_status !== 'ACTIVE') throw new Error('ບັນຊີປາຍທາງ ບໍ່ active');
        if (to.term_months > 0) throw new Error('ບໍ່ສາມາດ ຍ້າຍ ໄປບັນຊີປະຈຳ');

        const fromBalance = parseFloat(from.current_balance);
        const minBal = parseFloat(from.minimum_balance || 0);
        if (fromBalance - amount < minBal) {
            throw new Error(`ຍອດບັນຊີຕົ້ນທາງ ຫຼັງຍ້າຍ (${(fromBalance - amount).toLocaleString()}) ຕ່ຳກ່ວາ ຂັ້ນຕ່ຳ (${minBal.toLocaleString()})`);
        }

        const newFromBalance = fromBalance - amount;
        const newToBalance = parseFloat(to.current_balance) + amount;

        const fromCoa = DEPOSIT_COA[from.product_id];
        const toCoa = DEPOSIT_COA[to.product_id];
        const { branchId, orgCode } = await getBranch(t);
        const today = new Date().toISOString().split('T')[0];

        // JE: Dr From-Deposit / Cr To-Deposit
        const jeId = await createJE(t, {
            ref: `TRF-${from.account_no}-${to.account_no}-${refSuffix()}`,
            date: today, amount,
            desc: `ຍ້າຍ ${from.account_no} → ${to.account_no}: ${amount}`,
            module: 'DEPOSIT_TRANSFER', branchId, orgCode,
            lines: [
                { accountId: fromCoa.depositId, desc: `ຍ້າຍອອກ ${from.account_no}`, debit: amount, credit: 0 },
                { accountId: toCoa.depositId, desc: `ຍ້າຍເຂົ້າ ${to.account_no}`, debit: 0, credit: amount },
            ],
        });

        // Update balances
        await sequelize.query(
            `UPDATE deposit_accounts SET current_balance = :bal, updated_at = NOW() WHERE id = :id`,
            { replacements: { bal: newFromBalance, id: fromAccountId }, transaction: t }
        );
        await sequelize.query(
            `UPDATE deposit_accounts SET current_balance = :bal, updated_at = NOW() WHERE id = :id`,
            { replacements: { bal: newToBalance, id: toAccountId }, transaction: t }
        );

        // Transaction records
        await sequelize.query(`
            INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
            VALUES (:accId, 'TRANSFER_OUT', :amt, :bal, :ref, :remark)
        `, { replacements: { accId: fromAccountId, amt: amount, bal: newFromBalance, ref: `TRF-${from.account_no}-${to.account_no}-${today}`, remark: remark || `ຍ້າຍໄປ ${to.account_no}` }, transaction: t });

        await sequelize.query(`
            INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
            VALUES (:accId, 'TRANSFER_IN', :amt, :bal, :ref, :remark)
        `, { replacements: { accId: toAccountId, amt: amount, bal: newToBalance, ref: `TRF-${from.account_no}-${to.account_no}-${today}`, remark: remark || `ຍ້າຍມາຈາກ ${from.account_no}` }, transaction: t });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ຍ້າຍ ${from.account_no} → ${to.account_no}: ${amount.toLocaleString()} ₭`,
            data: {
                from: { accountNo: from.account_no, newBalance: newFromBalance },
                to: { accountNo: to.account_no, newBalance: newToBalance },
                amount, jeId,
            },
        });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// GET /api/deposit-operations/transactions — ລາຍການທຸລະກຳ
// ═══════════════════════════════════════════
router.get('/deposit-operations/transactions', async (_req, res) => {
    try {
        const [rows] = await sequelize.query(`
            SELECT dt.id, dt.transaction_type, dt.amount, dt.balance_after,
                   dt.reference_no, dt.remarks, dt.transaction_date,
                   da.account_no, dp.product_name_la
            FROM deposit_transactions dt
            JOIN deposit_accounts da ON dt.account_id = da.id
            JOIN deposit_products dp ON da.product_id = dp.id
            ORDER BY dt.id DESC
            LIMIT 100
        `);
        res.json({ status: true, data: rows });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// GET /api/deposit-operations/accounts — ບັນຊີ active ທັງໝົດ
router.get('/deposit-operations/accounts', async (_req, res) => {
    try {
        const [rows] = await sequelize.query(`
            SELECT da.id, da.account_no, da.current_balance, da.account_status,
                   da.accrued_interest, da.opening_date, da.maturity_date,
                   dp.product_name_la, dp.term_months, dp.minimum_balance,
                   COALESCE(pi.firstname__la || ' ' || pi.lastname__la,
                            ei.name__l_a, 'N/A') AS owner_name
            FROM deposit_accounts da
            JOIN deposit_products dp ON da.product_id = dp.id
            LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
            LEFT JOIN personal_info pi ON pi.id = dao.person_id
            LEFT JOIN enterprise_info ei ON ei.id = dao.enterprise_id
            WHERE da.account_status = 'ACTIVE'
            ORDER BY da.id
        `);
        res.json({ status: true, data: rows });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
