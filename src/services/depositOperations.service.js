/**
 * depositOperations.service.js — Centralized Business Logic for Deposit Lifecycle
 *
 * Controller → Service pattern
 * ທຸກ raw SQL + business logic + journal entries ຢູ່ນີ້
 */
const db = require('../models');
const sequelize = db.sequelize;

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
    try {
        const [rows] = await sequelize.query(
            `SELECT id FROM chart_of_accounts WHERE account_code = '236113'`
        );
        WHT_COA_ID = rows.length ? rows[0].id : null;
    } catch { /* ignore startup error */ }
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

// ── Helper: get account with product ──
async function getAccount(accountId, t) {
    const [accounts] = await sequelize.query(
        `SELECT da.*, dp.term_months, dp.minimum_balance, dp.early_penalty_rate,
                dp.interest_rate, dp.product_name_la
         FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
         WHERE da.id = :id`, { replacements: { id: accountId }, transaction: t }
    );
    if (!accounts.length) throw new Error('ບໍ່ພົບບັນຊີ');
    return accounts[0];
}

class DepositOperationsService {
    // ─────────────────────────────────
    // ① Deposit (ຝາກເງິນ)
    // ─────────────────────────────────
    static async deposit({ accountId, amount, remark }) {
        if (!accountId || !amount || amount <= 0) throw new Error('ກະລຸນາລະບຸ accountId ແລະ amount > 0');

        const t = await sequelize.transaction();
        try {
            const acc = await getAccount(accountId, t);
            if (acc.account_status === 'FROZEN') throw new Error('❄️ ບັນຊີຖືກລະງັບ — ບໍ່ອະນຸຍາດ ຝາກ (AML/CFT ມ.22)');
            if (acc.account_status !== 'ACTIVE') throw new Error('ບັນຊີບໍ່ active');
            if (acc.term_months > 0) throw new Error('ບັນຊີປະຈຳ ບໍ່ອະນຸຍາດ ຝາກເພີ່ມ');

            const newBalance = parseFloat(acc.current_balance) + amount;
            const coaMap = DEPOSIT_COA[acc.product_id];
            const { branchId, orgCode } = await getBranch(t);
            const today = new Date().toISOString().split('T')[0];

            const jeId = await createJE(t, {
                ref: `DIN-${acc.account_no}-${refSuffix()}`,
                date: today, amount, desc: `ຝາກເງິນ ${acc.account_no}: ${amount}`,
                module: 'DEPOSIT_IN', branchId, orgCode,
                lines: [
                    { accountId: CASH_COA_ID, desc: 'ຮັບເງິນສົດ', debit: amount, credit: 0 },
                    { accountId: coaMap.depositId, desc: `ຝາກເຂົ້າ ${acc.account_no}`, debit: 0, credit: amount },
                ],
            });

            await sequelize.query(
                `UPDATE deposit_accounts SET current_balance = :bal, updated_at = NOW() WHERE id = :id`,
                { replacements: { bal: newBalance, id: accountId }, transaction: t }
            );

            await sequelize.query(`
                INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                VALUES (:accId, 'DEPOSIT', :amt, :bal, :ref, :remark)
            `, { replacements: { accId: accountId, amt: amount, bal: newBalance, ref: `DIN-${acc.account_no}-${today}`, remark: remark || 'ຝາກເງິນ' }, transaction: t });

            await t.commit();
            return {
                status: true,
                message: `✅ ຝາກເງິນ ${acc.account_no}: ${amount.toLocaleString()} ₭`,
                data: { accountNo: acc.account_no, amount, newBalance, jeId },
            };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ─────────────────────────────────
    // ② Withdraw (ຖອນເງິນ)
    // ─────────────────────────────────
    static async withdraw({ accountId, amount, remark }) {
        if (!accountId || !amount || amount <= 0) throw new Error('ກະລຸນາລະບຸ accountId ແລະ amount > 0');

        const t = await sequelize.transaction();
        try {
            const acc = await getAccount(accountId, t);
            if (acc.account_status === 'FROZEN') throw new Error('❄️ ບັນຊີຖືກລະງັບ — ບໍ່ອະນຸຍາດ ຖອນ (AML/CFT ມ.22)');
            if (acc.account_status !== 'ACTIVE') throw new Error('ບັນຊີບໍ່ active');

            const balance = parseFloat(acc.current_balance);
            const minBal = parseFloat(acc.minimum_balance || 0);
            if (balance - amount < minBal) {
                throw new Error(`ຍອດຫຼັງຖອນ (${(balance - amount).toLocaleString()}) ຕ່ຳກ່ວາ ຂັ້ນຕ່ຳ (${minBal.toLocaleString()})`);
            }

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

            await sequelize.query(
                `UPDATE deposit_accounts SET current_balance = :bal, early_withdrawal_penalty = early_withdrawal_penalty + :penalty, updated_at = NOW() WHERE id = :id`,
                { replacements: { bal: newBalance, penalty, id: accountId }, transaction: t }
            );

            await sequelize.query(`
                INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                VALUES (:accId, 'WITHDRAWAL', :amt, :bal, :ref, :remark)
            `, {
                replacements: {
                    accId: accountId, amt: netWithdraw, bal: newBalance,
                    ref: `WDR-${acc.account_no}-${refSuffix()}`,
                    remark: remark || `ຖອນເງິນ${penalty > 0 ? ` (penalty: ${penalty})` : ''}`,
                }, transaction: t,
            });

            await t.commit();
            return {
                status: true,
                message: `✅ ຖອນເງິນ ${acc.account_no}: ${amount.toLocaleString()} ₭${penalty > 0 ? ` (penalty: ${penalty.toLocaleString()})` : ''}`,
                data: { accountNo: acc.account_no, amount: netWithdraw, penalty, newBalance, jeId },
            };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ─────────────────────────────────
    // ③ Close Account (ປິດບັນຊີ)
    // ─────────────────────────────────
    static async close({ accountId, reason, remark }) {
        if (!accountId) throw new Error('ກະລຸນາລະບຸ accountId');

        const t = await sequelize.transaction();
        try {
            const acc = await getAccount(accountId, t);
            if (acc.account_status !== 'ACTIVE') throw new Error('ບັນຊີບໍ່ active');

            const balance = parseFloat(acc.current_balance);
            const accruedInterest = parseFloat(acc.accrued_interest || 0);
            const coaMap = DEPOSIT_COA[acc.product_id];
            const liabCoaId = INTEREST_LIABILITY_COA[acc.product_id];
            const { branchId, orgCode } = await getBranch(t);
            const today = new Date().toISOString().split('T')[0];

            let penalty = 0;
            if (acc.term_months > 0 && acc.maturity_date && new Date(acc.maturity_date) > new Date()) {
                penalty = Math.round(accruedInterest * (parseFloat(acc.early_penalty_rate || 0) / 100) * 100) / 100;
            }

            const grossInterest = accruedInterest - penalty;
            const wht = grossInterest > 0 ? Math.round(grossInterest * WHT_RATE * 100) / 100 : 0;
            const netInterest = grossInterest - wht;
            const totalPayout = balance + (netInterest > 0 ? netInterest : 0);

            const lines = [];
            if (balance > 0) lines.push({ accountId: coaMap.depositId, desc: 'ຄືນເງິນຕົ້ນ', debit: balance, credit: 0 });
            if (accruedInterest > 0) lines.push({ accountId: liabCoaId, desc: 'ດອກເບ້ຍຄ້າງຈ່າຍ', debit: accruedInterest, credit: 0 });
            if (penalty > 0) lines.push({ accountId: coaMap.depositId, desc: 'ປັບໂທດ ຖອນກ່ອນກຳນົດ', debit: 0, credit: penalty });
            if (wht > 0 && WHT_COA_ID) lines.push({ accountId: WHT_COA_ID, desc: 'ອາກອນ WHT 10%', debit: 0, credit: wht });
            if (totalPayout > 0) lines.push({ accountId: CASH_COA_ID, desc: 'ຈ່າຍເງິນສົດ', debit: 0, credit: totalPayout });

            const totalDebit = balance + accruedInterest;
            const jeId = await createJE(t, {
                ref: `CLS-${acc.account_no}-${refSuffix()}`,
                date: today, amount: totalDebit,
                desc: `ປິດບັນຊີ ${acc.account_no}: ຕົ້ນ ${balance} + ດອກເບ້ຍ ${netInterest}`,
                module: 'DEPOSIT_CLOSE', branchId, orgCode, lines,
            });

            await sequelize.query(`
                UPDATE deposit_accounts SET
                    account_status = 'CLOSED', current_balance = 0, accrued_interest = 0,
                    closed_date = :today, closed_reason = :reason, early_withdrawal_penalty = :penalty,
                    updated_at = NOW()
                WHERE id = :id
            `, { replacements: { today, reason: reason || 'VOLUNTARY', penalty, id: accountId }, transaction: t });

            await sequelize.query(`
                INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                VALUES (:accId, 'CLOSE', :payout, 0, :ref, :remark)
            `, {
                replacements: {
                    accId: accountId, payout: totalPayout,
                    ref: `CLS-${acc.account_no}-${refSuffix()}`,
                    remark: remark || `ປິດບັນຊີ: ຕົ້ນ ${balance} + ດອກ ${netInterest} - WHT ${wht} - penalty ${penalty}`,
                }, transaction: t,
            });

            await sequelize.query(
                `UPDATE deposit_interest_accruals SET status = 'CLOSED' WHERE account_id = :id AND status IN ('ACCRUED','PAID')`,
                { replacements: { id: accountId }, transaction: t }
            );

            await t.commit();
            return {
                status: true,
                message: `✅ ປິດບັນຊີ ${acc.account_no}: ຈ່າຍ ${totalPayout.toLocaleString()} ₭`,
                data: { accountNo: acc.account_no, principal: balance, grossInterest, penalty, wht, netInterest, totalPayout, jeId },
            };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ─────────────────────────────────
    // ④ Transfer (ຍ້າຍບັນຊີ)
    // ─────────────────────────────────
    static async transfer({ fromAccountId, toAccountId, amount, remark }) {
        if (!fromAccountId || !toAccountId || !amount || amount <= 0) throw new Error('ກະລຸນາລະບຸ fromAccountId, toAccountId, amount > 0');
        if (fromAccountId === toAccountId) throw new Error('ບໍ່ສາມາດ ຍ້າຍ ໄປບັນຊີດຽວກັນ');

        const t = await sequelize.transaction();
        try {
            const from = await getAccount(fromAccountId, t);
            const to = await getAccount(toAccountId, t);

            if (from.account_status === 'FROZEN') throw new Error('❄️ ບັນຊີຕົ້ນທາງ ຖືກລະງັບ (AML/CFT ມ.22)');
            if (to.account_status === 'FROZEN') throw new Error('❄️ ບັນຊີປາຍທາງ ຖືກລະງັບ (AML/CFT ມ.22)');
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

            await sequelize.query(`UPDATE deposit_accounts SET current_balance = :bal, updated_at = NOW() WHERE id = :id`,
                { replacements: { bal: newFromBalance, id: fromAccountId }, transaction: t });
            await sequelize.query(`UPDATE deposit_accounts SET current_balance = :bal, updated_at = NOW() WHERE id = :id`,
                { replacements: { bal: newToBalance, id: toAccountId }, transaction: t });

            await sequelize.query(`INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks) VALUES (:accId, 'TRANSFER_OUT', :amt, :bal, :ref, :remark)`,
                { replacements: { accId: fromAccountId, amt: amount, bal: newFromBalance, ref: `TRF-${from.account_no}-${to.account_no}-${today}`, remark: remark || `ຍ້າຍໄປ ${to.account_no}` }, transaction: t });
            await sequelize.query(`INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks) VALUES (:accId, 'TRANSFER_IN', :amt, :bal, :ref, :remark)`,
                { replacements: { accId: toAccountId, amt: amount, bal: newToBalance, ref: `TRF-${from.account_no}-${to.account_no}-${today}`, remark: remark || `ຍ້າຍมาจาກ ${from.account_no}` }, transaction: t });

            await t.commit();
            return {
                status: true,
                message: `✅ ຍ້າຍ ${from.account_no} → ${to.account_no}: ${amount.toLocaleString()} ₭`,
                data: { from: { accountNo: from.account_no, newBalance: newFromBalance }, to: { accountNo: to.account_no, newBalance: newToBalance }, amount, jeId },
            };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ─────────────────────────────────
    // ⑤ Freeze (ລະງັບ AML/CFT)
    // ─────────────────────────────────
    static async freeze({ accountId, freezeType, reason, legalReference }, userId, tenantOrgId) {
        if (!accountId || !freezeType) throw new Error('ກະລຸນາລະບຸ accountId + freezeType');
        const validTypes = ['AML_HOLD', 'COURT_ORDER', 'DORMANT', 'ADMIN', 'CFT_SANCTION'];
        if (!validTypes.includes(freezeType)) throw new Error(`freezeType ບໍ່ຖືກ: ${validTypes.join(', ')}`);

        const t = await sequelize.transaction();
        try {
            const [accounts] = await sequelize.query(
                `SELECT id, account_no, account_status, current_balance FROM deposit_accounts WHERE id = :id`,
                { replacements: { id: accountId }, transaction: t }
            );
            if (!accounts.length) throw new Error('ບໍ່ພົບບັນຊີ');
            const acc = accounts[0];
            if (acc.account_status === 'FROZEN') throw new Error('ບັນຊີຖືກລະງັບແລ້ວ');
            if (acc.account_status === 'CLOSED') throw new Error('ບໍ່ສາມາດ ລະງັບ ບັນຊີທີ່ປິດແລ້ວ');

            await sequelize.query(`
                UPDATE deposit_accounts SET account_status = 'FROZEN', freeze_type = :freezeType,
                    freeze_reason = :reason, frozen_at = NOW(), frozen_by = :userId, updated_at = NOW()
                WHERE id = :id
            `, { replacements: { freezeType, reason: reason || '', userId, id: accountId }, transaction: t });

            await sequelize.query(`
                INSERT INTO deposit_freeze_history (account_id, action, freeze_type, reason, legal_reference, user_id, org_id)
                VALUES (:accId, 'FREEZE', :freezeType, :reason, :legalRef, :userId, :orgId)
            `, { replacements: { accId: accountId, freezeType, reason: reason || '', legalRef: legalReference || '', userId, orgId: tenantOrgId || null }, transaction: t });

            await sequelize.query(`
                INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                VALUES (:accId, 'FREEZE', 0, :bal, :ref, :remark)
            `, { replacements: { accId: accountId, bal: acc.current_balance, ref: `FRZ-${acc.account_no}-${refSuffix()}`, remark: `ລະງັບ: ${freezeType} — ${reason || ''}` }, transaction: t });

            await t.commit();
            return {
                status: true,
                message: `🔒 ລະງັບບັນຊີ ${acc.account_no} ສຳເລັດ (${freezeType})`,
                data: { accountNo: acc.account_no, freezeType, reason },
            };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ─────────────────────────────────
    // ⑥ Unfreeze (ຍົກເລີກລະງັບ)
    // ─────────────────────────────────
    static async unfreeze({ accountId, reason }, userId, tenantOrgId) {
        if (!accountId) throw new Error('ກະລຸນາລະບຸ accountId');

        const t = await sequelize.transaction();
        try {
            const [accounts] = await sequelize.query(
                `SELECT id, account_no, account_status, current_balance, freeze_type FROM deposit_accounts WHERE id = :id`,
                { replacements: { id: accountId }, transaction: t }
            );
            if (!accounts.length) throw new Error('ບໍ່ພົບບັນຊີ');
            const acc = accounts[0];
            if (acc.account_status !== 'FROZEN') throw new Error('ບັນຊີ ບໍ່ໄດ້ຖືກລະງັບ');

            await sequelize.query(`
                UPDATE deposit_accounts SET account_status = 'ACTIVE', unfreeze_at = NOW(), unfreeze_by = :userId, updated_at = NOW()
                WHERE id = :id
            `, { replacements: { userId, id: accountId }, transaction: t });

            await sequelize.query(`
                INSERT INTO deposit_freeze_history (account_id, action, freeze_type, reason, user_id, org_id)
                VALUES (:accId, 'UNFREEZE', :freezeType, :reason, :userId, :orgId)
            `, { replacements: { accId: accountId, freezeType: acc.freeze_type || '', reason: reason || '', userId, orgId: tenantOrgId || null }, transaction: t });

            await sequelize.query(`
                INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                VALUES (:accId, 'UNFREEZE', 0, :bal, :ref, :remark)
            `, { replacements: { accId: accountId, bal: acc.current_balance, ref: `UFZ-${acc.account_no}-${refSuffix()}`, remark: `ຍົກເລີກລະງັບ: ${reason || ''}` }, transaction: t });

            await t.commit();
            return {
                status: true,
                message: `🔓 ຍົກເລີກລະງັບ ${acc.account_no} ສຳເລັດ`,
                data: { accountNo: acc.account_no },
            };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ─────────────────────────────────
    // ⑦ Get Exchange Rate
    // ─────────────────────────────────
    static async getExchangeRate(from, to) {
        if (!from || !to) throw Object.assign(new Error('from + to required'), { statusCode: 400 });

        let rate = null;
        if (from === 'LAK' && to !== 'LAK') {
            const [rows] = await sequelize.query(
                `SELECT selling_rate, buying_rate, mid_rate, rate_date FROM exchange_rates WHERE currency_code = :code ORDER BY rate_date DESC LIMIT 1`,
                { replacements: { code: to } }
            );
            if (rows.length) rate = { ...rows[0], direction: 'SELL', fromCurrency: from, toCurrency: to };
        } else if (from !== 'LAK' && to === 'LAK') {
            const [rows] = await sequelize.query(
                `SELECT selling_rate, buying_rate, mid_rate, rate_date FROM exchange_rates WHERE currency_code = :code ORDER BY rate_date DESC LIMIT 1`,
                { replacements: { code: from } }
            );
            if (rows.length) rate = { ...rows[0], direction: 'BUY', fromCurrency: from, toCurrency: to };
        } else {
            throw Object.assign(new Error('ຕ້ອງມີ LAK ເປັນ from ຫຼື to'), { statusCode: 400 });
        }

        if (!rate) throw Object.assign(new Error(`ບໍ່ພົບອັດຕາ ${from}→${to}`), { statusCode: 404 });
        return { status: true, data: rate };
    }

    // ─────────────────────────────────
    // ⑧ Exchange (ແລກເງິນ)
    // ─────────────────────────────────
    static async exchange({ fromCurrency, toCurrency, fromAmount, accountId, remark }, userId, tenantOrgId) {
        if (!fromCurrency || !toCurrency || !fromAmount || fromAmount <= 0) throw new Error('ກະລຸນາລະບຸ fromCurrency, toCurrency, fromAmount > 0');
        if (fromCurrency === toCurrency) throw new Error('ສະກຸນເງິນ ຕ້ອງແຕກຕ່າງ');

        const t = await sequelize.transaction();
        try {
            let exchangeRate, rateType, toAmount;
            if (fromCurrency !== 'LAK' && toCurrency === 'LAK') {
                const [rates] = await sequelize.query(`SELECT buying_rate FROM exchange_rates WHERE currency_code = :code ORDER BY rate_date DESC LIMIT 1`, { replacements: { code: fromCurrency }, transaction: t });
                if (!rates.length) throw new Error(`ບໍ່ພົບ ອັດຕາ ${fromCurrency}`);
                exchangeRate = parseFloat(rates[0].buying_rate);
                rateType = 'BUY';
                toAmount = Math.round(fromAmount * exchangeRate * 100) / 100;
            } else if (fromCurrency === 'LAK' && toCurrency !== 'LAK') {
                const [rates] = await sequelize.query(`SELECT selling_rate FROM exchange_rates WHERE currency_code = :code ORDER BY rate_date DESC LIMIT 1`, { replacements: { code: toCurrency }, transaction: t });
                if (!rates.length) throw new Error(`ບໍ່ພົບ ອັດຕາ ${toCurrency}`);
                exchangeRate = parseFloat(rates[0].selling_rate);
                rateType = 'SELL';
                toAmount = Math.round((fromAmount / exchangeRate) * 100) / 100;
            } else {
                throw new Error('ຕ້ອງມີ LAK ເປັນ from ຫຼື to (BoL 11/BOL)');
            }

            const { branchId, orgCode } = await getBranch(t);
            const today = new Date().toISOString().split('T')[0];
            const refNo = `EXC-${fromCurrency}-${toCurrency}-${refSuffix()}`;

            let profitLoss = 0;
            const fxCode = rateType === 'BUY' ? fromCurrency : toCurrency;
            const [midRows] = await sequelize.query(`SELECT mid_rate FROM exchange_rates WHERE currency_code = :code ORDER BY rate_date DESC LIMIT 1`, { replacements: { code: fxCode }, transaction: t });
            if (midRows.length) {
                profitLoss = rateType === 'BUY'
                    ? Math.round(fromAmount * (parseFloat(midRows[0].mid_rate) - exchangeRate) * 100) / 100
                    : Math.round(toAmount * (exchangeRate - parseFloat(midRows[0].mid_rate)) * 100) / 100;
            }

            const jeAmount = rateType === 'BUY' ? toAmount : fromAmount;
            const jeId = await createJE(t, {
                ref: refNo, date: today, amount: jeAmount,
                desc: `ແลກເງິນ ${fromAmount.toLocaleString()} ${fromCurrency} → ${toAmount.toLocaleString()} ${toCurrency}`,
                module: 'CURRENCY_EXCHANGE', branchId, orgCode,
                lines: [
                    { accountId: CASH_COA_ID, desc: `ຮັບ ${fromCurrency}`, debit: jeAmount, credit: 0 },
                    { accountId: CASH_COA_ID, desc: `ຈ່າຍ ${toCurrency}`, debit: 0, credit: jeAmount },
                ],
            });

            await sequelize.query(`
                INSERT INTO deposit_exchange_transactions
                    (account_id, from_currency, to_currency, from_amount, exchange_rate, to_amount,
                     rate_type, profit_loss, reference_no, journal_entry_id, processed_by, org_id)
                VALUES (:accId, :from, :to, :fromAmt, :rate, :toAmt, :rateType, :pl, :ref, :jeId, :userId, :orgId)
            `, {
                replacements: {
                    accId: accountId || null, from: fromCurrency, to: toCurrency,
                    fromAmt: fromAmount, rate: exchangeRate, toAmt: toAmount,
                    rateType, pl: profitLoss, ref: refNo, jeId,
                    userId: userId || 1, orgId: tenantOrgId || null,
                }, transaction: t,
            });

            const lakAmount = rateType === 'BUY' ? toAmount : fromAmount;
            if (lakAmount >= 100_000_000) {
                await sequelize.query(`
                    INSERT INTO amlio_reports (report_type, currency_code, amount, risk_level, reason, status, org_id)
                    VALUES ('CTR', 'LAK', :amt, 'HIGH', :reason, 'DRAFT', :orgId)
                `, { replacements: { amt: lakAmount, reason: `ແລກເງິນ ≥100M: ${fromAmount} ${fromCurrency} → ${toAmount} ${toCurrency}`, orgId: tenantOrgId || null }, transaction: t });
            }

            await t.commit();
            return {
                status: true,
                message: `✅ ແລກເງິນ ${fromAmount.toLocaleString()} ${fromCurrency} → ${toAmount.toLocaleString()} ${toCurrency}`,
                data: { fromCurrency, toCurrency, fromAmount, toAmount, exchangeRate, rateType, profitLoss, jeId },
            };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ─────────────────────────────────
    // ⑨ Get Transactions List
    // ─────────────────────────────────
    static async getTransactions() {
        const [rows] = await sequelize.query(`
            SELECT dt.id, dt.transaction_type, dt.amount, dt.balance_after,
                   dt.reference_no, dt.remarks, dt.transaction_date,
                   da.account_no, dp.product_name_la
            FROM deposit_transactions dt
            JOIN deposit_accounts da ON dt.account_id = da.id
            JOIN deposit_products dp ON da.product_id = dp.id
            ORDER BY dt.id DESC LIMIT 100
        `);
        return { status: true, data: rows };
    }

    // ─────────────────────────────────
    // ⑩ Get All Active Accounts
    // ─────────────────────────────────
    static async getAccounts() {
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
            WHERE da.account_status IN ('ACTIVE', 'FROZEN')
            ORDER BY da.id
        `);
        return { status: true, data: rows };
    }

    // ─────────────────────────────────
    // ⑪ Get Freeze History
    // ─────────────────────────────────
    static async getFreezeHistory(accountId) {
        const [rows] = await sequelize.query(`
            SELECT dfh.*, u.username
            FROM deposit_freeze_history dfh
            LEFT JOIN users u ON u.id = dfh.user_id
            WHERE dfh.account_id = :id ORDER BY dfh.id DESC
        `, { replacements: { id: accountId } });
        return { status: true, data: rows };
    }

    // ─────────────────────────────────
    // ⑫ Get Exchange History
    // ─────────────────────────────────
    static async getExchangeHistory() {
        const [rows] = await sequelize.query(`
            SELECT det.*, u.username
            FROM deposit_exchange_transactions det
            LEFT JOIN users u ON u.id = det.processed_by
            ORDER BY det.id DESC LIMIT 100
        `);
        return { status: true, data: rows };
    }
}

module.exports = DepositOperationsService;
