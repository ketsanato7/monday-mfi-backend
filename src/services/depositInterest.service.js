/**
 * depositInterest.service.js — Deposit Interest Business Logic
 * ═══════════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 510 ແຖວ ໃນ deposit-interest.routes.js
 * ✅ ຫຼັງ: service ລວມ logic, route ເປັນ thin controller
 *
 * Methods: summary(), accrue(), payMonthly(), mature()
 */
const logger = require('../config/logger');
const db = require('../models');
const sequelize = db.sequelize;

// ── COA MAPPING — product_id → COA IDs ──
const INTEREST_COA_MAP = {
    1: { expenseId: 1371, liabilityId: null, depositId: 1008, liabilityCode: '213742', type: 'savings' },
    2: { expenseId: 1372, liabilityId: null, depositId: 1010, liabilityCode: '213743', type: 'fixed' },
    3: { expenseId: 1372, liabilityId: null, depositId: 1010, liabilityCode: '213743', type: 'fixed' },
    4: { expenseId: 1370, liabilityId: null, depositId: 1007, liabilityCode: '213741', type: 'current' },
};
const WHT_RATE = 0.10;
const WHT_COA_CODE = '236113';
const CASH_COA_ID = 3;

// Resolve COA IDs once on startup
(async () => {
    try {
        for (const [, map] of Object.entries(INTEREST_COA_MAP)) {
            if (!map.liabilityCode) continue;
            const [rows] = await sequelize.query(`SELECT id FROM chart_of_accounts WHERE account_code = :code`, { replacements: { code: map.liabilityCode } });
            if (rows.length) map.liabilityId = rows[0].id;
        }
        const [whtRows] = await sequelize.query(`SELECT id FROM chart_of_accounts WHERE account_code = :code`, { replacements: { code: WHT_COA_CODE } });
        INTEREST_COA_MAP._whtCoaId = whtRows.length ? whtRows[0].id : null;
        logger.info('✅ Interest COA IDs resolved');
    } catch { /* ignore startup error */ }
})();

// ── Shared: getBranch ──
async function getBranch(t) {
    const [rows] = await sequelize.query(`SELECT id, org_code FROM org_branches WHERE code = 'HQ' LIMIT 1`, { transaction: t });
    return { branchId: rows.length ? String(rows[0].id) : null, orgCode: rows.length ? rows[0].org_code : 'MFI-001' };
}

// ── Shared: create JE with lines ──
async function createJE(t, { ref, date, amount, desc, module, branchId, orgCode, lines }) {
    const [jeResult] = await sequelize.query(`
        INSERT INTO journal_entries (reference_no, transaction_date, currency_code, total_debit, total_credit, status, description, source_module, branch_id, org_code)
        VALUES (:ref, :date, 'LAK', :amt, :amt, 'POSTED', :desc, :module, :branchId, :orgCode) RETURNING id
    `, { replacements: { ref, date, amt: amount, desc, module, branchId, orgCode }, transaction: t });
    const jeId = jeResult[0].id;
    for (const line of lines) {
        await sequelize.query(`
            INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
            VALUES (:jeId, :accId, :desc, :dr, :cr, :branchId)
        `, { replacements: { jeId, accId: line.accountId, desc: line.desc, dr: line.debit || 0, cr: line.credit || 0, branchId }, transaction: t });
    }
    return jeId;
}

class DepositInterestService {
    // ① GET summary
    static async summary() {
        const [accounts] = await sequelize.query(`
            SELECT da.id, da.account_no, da.current_balance, da.accrued_interest,
                   da.opening_date, da.maturity_date, da.account_status,
                   dp.product_name_la, dp.interest_rate, dp.term_months,
                   COALESCE(pi.firstname__la || ' ' || pi.lastname__la, ei.name__l_a, 'N/A') AS owner_name
            FROM deposit_accounts da
            LEFT JOIN deposit_products dp ON da.product_id = dp.id
            LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
            LEFT JOIN personal_info pi ON pi.id = dao.person_id
            LEFT JOIN enterprise_info ei ON ei.id = dao.enterprise_id
            WHERE da.account_status = 'ACTIVE' ORDER BY da.id
        `);
        const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.current_balance || 0), 0);
        const totalAccrued = accounts.reduce((s, a) => s + parseFloat(a.accrued_interest || 0), 0);
        const maturingAccounts = accounts.filter(a => a.maturity_date && new Date(a.maturity_date) <= new Date());
        const dailyProjection = accounts.reduce((s, a) => s + (parseFloat(a.current_balance || 0) * (parseFloat(a.interest_rate || 0) / 100) / 365), 0);

        return { status: true, data: { accounts, summary: { totalAccounts: accounts.length, totalBalance: totalBalance.toFixed(2), totalAccruedInterest: totalAccrued.toFixed(2), dailyInterestProjection: dailyProjection.toFixed(2), maturingCount: maturingAccounts.length, maturingAccounts } } };
    }

    // ② POST accrue
    static async accrue(date) {
        const accrualDate = date || new Date().toISOString().split('T')[0];
        const t = await sequelize.transaction();
        try {
            const [accounts] = await sequelize.query(`
                SELECT da.id, da.account_no, da.current_balance, da.accrued_interest, da.product_id, dp.interest_rate
                FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
                WHERE da.account_status = 'ACTIVE' AND da.current_balance > 0
            `, { transaction: t });

            let totalAccrued = 0;
            const results = [];
            for (const acc of accounts) {
                const balance = parseFloat(acc.current_balance);
                const annualRate = parseFloat(acc.interest_rate) / 100;
                const dailyAmount = Math.round(balance * (annualRate / 365) * 100) / 100;
                if (dailyAmount <= 0) continue;

                const [existing] = await sequelize.query(`SELECT id FROM deposit_interest_accruals WHERE account_id = :accId AND accrual_date = :date`, { replacements: { accId: acc.id, date: accrualDate }, transaction: t });
                if (existing.length > 0) continue;

                const newAccrued = parseFloat(acc.accrued_interest || 0) + dailyAmount;
                const coaMap = INTEREST_COA_MAP[acc.product_id];
                if (!coaMap) continue;

                const { branchId, orgCode } = await getBranch(t);
                const jeId = await createJE(t, {
                    ref: `INT-${acc.account_no}-${accrualDate}`, date: accrualDate, amount: dailyAmount,
                    desc: `ຄິດໄລ່ດອກເບ້ຍ ${acc.account_no} (${accrualDate})`, module: 'DEPOSIT_INTEREST', branchId, orgCode,
                    lines: [
                        { accountId: coaMap.expenseId, desc: `ດອກເບ້ຍ ${acc.account_no}`, debit: dailyAmount, credit: 0 },
                        { accountId: coaMap.liabilityId, desc: `ດອກເບ້ຍ ${acc.account_no}`, debit: 0, credit: dailyAmount },
                    ],
                });

                await sequelize.query(`INSERT INTO deposit_interest_accruals (account_id, accrual_date, balance_used, annual_rate, daily_rate, accrued_amount, cumulative_amount, journal_entry_id, status) VALUES (:accId, :date, :balance, :annualRate, :dailyRate, :amount, :cumulative, :jeId, 'ACCRUED')`,
                    { replacements: { accId: acc.id, date: accrualDate, balance, annualRate: annualRate * 100, dailyRate: annualRate / 365, amount: dailyAmount, cumulative: newAccrued, jeId }, transaction: t });

                await sequelize.query(`UPDATE deposit_accounts SET accrued_interest = :amt, updated_at = NOW() WHERE id = :id`, { replacements: { amt: newAccrued, id: acc.id }, transaction: t });

                totalAccrued += dailyAmount;
                results.push({ accountNo: acc.account_no, balance, annualRate: annualRate * 100, dailyAmount, newAccruedTotal: newAccrued, jeId });
            }
            await t.commit();
            return { status: true, message: `✅ ຄິດໄລ່ດອກເບ້ຍ ${accrualDate}: ${results.length} ບັນຊີ, ລວມ ${totalAccrued.toFixed(2)} ₭`, data: { accrualDate, totalAccrued: totalAccrued.toFixed(2), accountCount: results.length, details: results } };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ③ POST pay-monthly
    static async payMonthly(date) {
        const payDate = date || new Date().toISOString().split('T')[0];
        const t = await sequelize.transaction();
        try {
            const [accounts] = await sequelize.query(`
                SELECT da.id, da.account_no, da.current_balance, da.accrued_interest, da.product_id, dp.interest_rate, dp.term_months
                FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
                WHERE da.account_status = 'ACTIVE' AND dp.term_months = 0 AND da.accrued_interest > 0
            `, { transaction: t });

            const results = []; let totalPaid = 0; let totalWHT = 0;
            for (const acc of accounts) {
                const grossInterest = parseFloat(acc.accrued_interest);
                if (grossInterest <= 0) continue;
                const wht = Math.round(grossInterest * WHT_RATE * 100) / 100;
                const netInterest = grossInterest - wht;
                const coaMap = INTEREST_COA_MAP[acc.product_id];
                if (!coaMap) continue;

                const { branchId, orgCode } = await getBranch(t);
                const jeId = await createJE(t, {
                    ref: `PAY-${acc.account_no}-${payDate}`, date: payDate, amount: grossInterest,
                    desc: `ຈ່າຍດອກເບ້ຍ ${acc.account_no} (WHT ${wht})`, module: 'DEPOSIT_INTEREST_PAY', branchId, orgCode,
                    lines: [
                        { accountId: coaMap.liabilityId, desc: 'ດອກເບ້ຍຄ້າງຈ່າຍ', debit: grossInterest, credit: 0 },
                        ...(wht > 0 ? [{ accountId: INTEREST_COA_MAP._whtCoaId, desc: 'ອາກອນ WHT 10%', debit: 0, credit: wht }] : []),
                        { accountId: coaMap.depositId, desc: 'ດອກເບ້ຍເຂົ້າບັນຊີ (ສຸດທິ)', debit: 0, credit: netInterest },
                    ],
                });

                const newBalance = parseFloat(acc.current_balance) + netInterest;
                await sequelize.query(`UPDATE deposit_accounts SET current_balance = :bal, accrued_interest = 0, updated_at = NOW() WHERE id = :id`, { replacements: { bal: newBalance, id: acc.id }, transaction: t });
                await sequelize.query(`INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks) VALUES (:accId, 'INTEREST', :net, :bal, :ref, :remark)`, { replacements: { accId: acc.id, net: netInterest, bal: newBalance, ref: `PAY-${acc.account_no}-${payDate}`, remark: `ດອກເບ້ຍ ${grossInterest} - WHT ${wht} = ${netInterest}` }, transaction: t });
                await sequelize.query(`UPDATE deposit_interest_accruals SET status = 'PAID' WHERE account_id = :id AND status = 'ACCRUED'`, { replacements: { id: acc.id }, transaction: t });

                totalPaid += netInterest; totalWHT += wht;
                results.push({ accountNo: acc.account_no, grossInterest, wht, netInterest, newBalance, jeId });
            }
            await t.commit();
            return { status: true, message: `✅ ຈ່າຍດອກເບ້ຍ ${results.length} ບັນຊີ: ລວມ ${totalPaid.toFixed(2)} ₭ (WHT: ${totalWHT.toFixed(2)} ₭)`, data: { payDate, totalPaid: totalPaid.toFixed(2), totalWHT: totalWHT.toFixed(2), details: results } };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ④ POST mature
    static async mature(date) {
        const matureDate = date || new Date().toISOString().split('T')[0];
        const t = await sequelize.transaction();
        try {
            const [accounts] = await sequelize.query(`
                SELECT da.id, da.account_no, da.current_balance, da.accrued_interest, da.product_id, da.maturity_date
                FROM deposit_accounts da JOIN deposit_products dp ON da.product_id = dp.id
                WHERE da.account_status = 'ACTIVE' AND dp.term_months > 0 AND da.maturity_date IS NOT NULL AND da.maturity_date <= :date
            `, { replacements: { date: matureDate }, transaction: t });

            const results = [];
            for (const acc of accounts) {
                const principal = parseFloat(acc.current_balance);
                const grossInterest = parseFloat(acc.accrued_interest || 0);
                const wht = Math.round(grossInterest * WHT_RATE * 100) / 100;
                const netInterest = grossInterest - wht;
                const totalPayout = principal + netInterest;
                const coaMap = INTEREST_COA_MAP[acc.product_id];
                if (!coaMap) continue;

                const { branchId, orgCode } = await getBranch(t);
                const totalDebit = grossInterest + principal;
                const lines = [];
                if (grossInterest > 0) lines.push({ accountId: coaMap.liabilityId, desc: 'ດອກເບ້ຍຄ້າງຈ່າຍ', debit: grossInterest, credit: 0 });
                lines.push({ accountId: coaMap.depositId, desc: 'ຄືນເງິນຕົ້ນ', debit: principal, credit: 0 });
                if (wht > 0) lines.push({ accountId: INTEREST_COA_MAP._whtCoaId, desc: 'ອາກອນ WHT 10%', debit: 0, credit: wht });
                lines.push({ accountId: CASH_COA_ID, desc: 'ຈ່າຍເງິນສົດ', debit: 0, credit: totalPayout });

                const jeId = await createJE(t, { ref: `MAT-${acc.account_no}`, date: matureDate, amount: totalDebit, desc: `ຄົບກຳນົດ ${acc.account_no}: ຕົ້ນ ${principal} + ດອກເບ້ຍ ${netInterest}`, module: 'DEPOSIT_MATURITY', branchId, orgCode, lines });

                await sequelize.query(`UPDATE deposit_accounts SET account_status = 'MATURED', current_balance = 0, accrued_interest = 0, updated_at = NOW() WHERE id = :id`, { replacements: { id: acc.id }, transaction: t });
                await sequelize.query(`INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks) VALUES (:accId, 'MATURITY', :payout, 0, :ref, :remark)`, { replacements: { accId: acc.id, payout: totalPayout, ref: `MAT-${acc.account_no}`, remark: `ຄົບກຳນົດ: ຕົ້ນ ${principal} + ດອກເບ້ຍ ${netInterest} - WHT ${wht}` }, transaction: t });

                results.push({ accountNo: acc.account_no, principal, grossInterest, wht, netInterest, totalPayout, jeId });
            }
            await t.commit();
            return { status: true, message: `✅ ດຳເນີນການຄົບກຳນົດ ${results.length} ບັນຊີ`, data: { matureDate, details: results } };
        } catch (err) { await t.rollback(); throw err; }
    }
}

module.exports = DepositInterestService;
