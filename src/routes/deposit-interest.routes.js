/**
 * deposit-interest.routes.js — API ຄິດໄລ່ + ຈ່າຍດອກເບ້ຍເງິນຝາກ
 *
 * Endpoints:
 *  GET  /api/deposit-interest/summary        — ສະຫຼຸບດອກເບ້ຍທັງໝົດ
 *  POST /api/deposit-interest/accrue          — ຄິດໄລ່ດອກເບ້ຍປະຈຳວັນ (IFRS 9)
 *  POST /api/deposit-interest/pay-monthly     — ຈ່າຍດອກເບ້ຍລາຍເດືອນ (Savings/Current)
 *  POST /api/deposit-interest/mature          — ດຳເນີນການຄົບກຳນົດ (Fixed)
 *
 * COA Mapping (BOL Standard):
 *  EXPENSE:   410211 (ກະແສ), 410213 (ປະຢັດ), 410215 (ມີກຳນົດ)
 *  LIABILITY: 213741 (ກະແສ), 213742 (ປະຢັດ), 213743 (ມີກຳນົດ)
 *  TAX:       236113 (ອາກອນ WHT 10%)
 *  DEPOSIT:   213111 (ກະແສ), 213113 (ປະຢັດ), 213115 (ມີກຳນົດ)
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;
const { requirePermission } = require('../middleware/rbac');

// ═══════════════════════════════════════════
// COA MAPPING — product_id → COA IDs
// ═══════════════════════════════════════════
const INTEREST_COA_MAP = {
    // product.id → { expense COA, liability COA, deposit COA }
    1: { // Savings (ປະຢັດ)
        expenseCode: '410213', expenseId: 1371,
        liabilityCode: '213742', liabilityId: null,  // will resolve
        depositCode: '213113', depositId: 1008,
        type: 'savings',
    },
    2: { // Fixed 6M (ປະຈຳ 6 ເດືອນ)
        expenseCode: '410215', expenseId: 1372,
        liabilityCode: '213743', liabilityId: null,
        depositCode: '213115', depositId: 1010,
        type: 'fixed',
    },
    3: { // Fixed 12M (ປະຈຳ 12 ເດືອນ)
        expenseCode: '410215', expenseId: 1372,
        liabilityCode: '213743', liabilityId: null,
        depositCode: '213115', depositId: 1010,
        type: 'fixed',
    },
    4: { // Current (ກະແສລາຍວັນ)
        expenseCode: '410211', expenseId: 1370,
        liabilityCode: '213741', liabilityId: null,
        depositCode: '213111', depositId: 1007,
        type: 'current',
    },
};

const WHT_RATE = 0.10; // 10% withholding tax
const WHT_COA_CODE = '236113'; // ພາສີ/ອາກອນ ຫັກໄວ້
const CASH_COA_ID = 3; // 11011 ເງິນສົດໃນຄັງ

// Resolve liability COA IDs on startup
async function resolveLiabilityCOA() {
    for (const [, map] of Object.entries(INTEREST_COA_MAP)) {
        const [rows] = await sequelize.query(
            `SELECT id FROM chart_of_accounts WHERE account_code = :code`,
            { replacements: { code: map.liabilityCode } }
        );
        if (rows.length) map.liabilityId = rows[0].id;
    }
    const [whtRows] = await sequelize.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = :code`,
        { replacements: { code: WHT_COA_CODE } }
    );
    INTEREST_COA_MAP._whtCoaId = whtRows.length ? whtRows[0].id : null;
    console.log('✅ Interest COA IDs resolved');
}
resolveLiabilityCOA();

// ═══════════════════════════════════════════
// GET /api/deposit-interest/summary
// ═══════════════════════════════════════════
router.get('/deposit-interest/summary', async (_req, res) => {
    try {
        const [accounts] = await sequelize.query(`
            SELECT da.id, da.account_no, da.current_balance, da.accrued_interest,
                   da.opening_date, da.maturity_date, da.account_status,
                   dp.product_name_la, dp.interest_rate, dp.term_months,
                   COALESCE(pi.firstname__la || ' ' || pi.lastname__la,
                            ei.name__l_a, 'N/A') AS owner_name,
                   CASE WHEN dao.person_id IS NOT NULL THEN 'individual' ELSE 'enterprise' END AS owner_type
            FROM deposit_accounts da
            LEFT JOIN deposit_products dp ON da.product_id = dp.id
            LEFT JOIN deposit_account_owners dao ON dao.account_id = da.id
            LEFT JOIN personal_info pi ON pi.id = dao.person_id
            LEFT JOIN enterprise_info ei ON ei.id = dao.enterprise_id
            WHERE da.account_status = 'ACTIVE'
            ORDER BY da.id
        `);

        // Summary stats
        const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.current_balance || 0), 0);
        const totalAccrued = accounts.reduce((s, a) => s + parseFloat(a.accrued_interest || 0), 0);
        const maturingAccounts = accounts.filter(a =>
            a.maturity_date && new Date(a.maturity_date) <= new Date()
        );

        // Daily interest projection
        const dailyProjection = accounts.reduce((s, a) => {
            const rate = parseFloat(a.interest_rate || 0) / 100;
            return s + (parseFloat(a.current_balance || 0) * rate / 365);
        }, 0);

        res.json({
            status: true,
            data: {
                accounts,
                summary: {
                    totalAccounts: accounts.length,
                    totalBalance: totalBalance.toFixed(2),
                    totalAccruedInterest: totalAccrued.toFixed(2),
                    dailyInterestProjection: dailyProjection.toFixed(2),
                    maturingCount: maturingAccounts.length,
                    maturingAccounts,
                },
            },
        });
    } catch (err) {
        console.error('❌ Interest summary error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// POST /api/deposit-interest/accrue
// ═══════════════════════════════════════════
router.post('/deposit-interest/accrue', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const accrualDate = req.body.date || new Date().toISOString().split('T')[0]; // yyyy-MM-dd

        // Get all ACTIVE accounts with product info
        const [accounts] = await sequelize.query(`
            SELECT da.id, da.account_no, da.current_balance, da.accrued_interest,
                   da.product_id, dp.interest_rate
            FROM deposit_accounts da
            JOIN deposit_products dp ON da.product_id = dp.id
            WHERE da.account_status = 'ACTIVE' AND da.current_balance > 0
        `, { transaction: t });

        let totalAccrued = 0;
        const results = [];

        for (const acc of accounts) {
            const balance = parseFloat(acc.current_balance);
            const annualRate = parseFloat(acc.interest_rate) / 100;
            const dailyRate = annualRate / 365;
            const dailyAmount = Math.round(balance * dailyRate * 100) / 100;

            if (dailyAmount <= 0) continue;

            // Check if already accrued for this date
            const [existing] = await sequelize.query(
                `SELECT id FROM deposit_interest_accruals WHERE account_id = :accId AND accrual_date = :date`,
                { replacements: { accId: acc.id, date: accrualDate }, transaction: t }
            );
            if (existing.length > 0) continue; // skip already accrued

            const newAccrued = parseFloat(acc.accrued_interest || 0) + dailyAmount;

            // Get COA mapping
            const coaMap = INTEREST_COA_MAP[acc.product_id];
            if (!coaMap) continue;

            // Get branch
            const [branchRows] = await sequelize.query(
                `SELECT id, org_code FROM org_branches WHERE code = 'HQ' LIMIT 1`,
                { transaction: t }
            );
            const branchId = branchRows.length ? String(branchRows[0].id) : null;

            // Get org info
            const orgCode = branchRows.length ? branchRows[0].org_code : 'MFI-001';

            // Create JE: Dr EXPENSE / Cr LIABILITY
            const [jeResult] = await sequelize.query(`
                INSERT INTO journal_entries
                    (reference_no, transaction_date, currency_code, total_debit, total_credit,
                     status, description, source_module, branch_id, org_code)
                VALUES (:ref, :date, 'LAK', :amt, :amt,
                        'POSTED', :desc, 'DEPOSIT_INTEREST', :branchId, :orgCode)
                RETURNING id
            `, {
                replacements: {
                    ref: `INT-${acc.account_no}-${accrualDate}`,
                    date: accrualDate,
                    amt: dailyAmount,
                    desc: `ຄິດໄລ່ດອກເບ້ຍ ${acc.account_no} (${accrualDate})`,
                    branchId, orgCode,
                },
                transaction: t,
            });
            const jeId = jeResult[0].id;

            // JE Lines
            await sequelize.query(`
                INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                VALUES (:jeId, :expId, :desc, :amt, 0, :branchId),
                       (:jeId, :liabId, :desc, 0, :amt, :branchId)
            `, {
                replacements: {
                    jeId,
                    expId: coaMap.expenseId,
                    liabId: coaMap.liabilityId,
                    desc: `ດອກເບ້ຍ ${acc.account_no}`,
                    amt: dailyAmount,
                    branchId,
                },
                transaction: t,
            });

            // Insert accrual record
            await sequelize.query(`
                INSERT INTO deposit_interest_accruals
                    (account_id, accrual_date, balance_used, annual_rate, daily_rate, accrued_amount, cumulative_amount, journal_entry_id, status)
                VALUES (:accId, :date, :balance, :annualRate, :dailyRate, :amount, :cumulative, :jeId, 'ACCRUED')
            `, {
                replacements: {
                    accId: acc.id, date: accrualDate, balance,
                    annualRate: annualRate * 100, dailyRate, amount: dailyAmount,
                    cumulative: newAccrued, jeId,
                },
                transaction: t,
            });

            // Update accrued_interest on account
            await sequelize.query(
                `UPDATE deposit_accounts SET accrued_interest = :amt, updated_at = NOW() WHERE id = :id`,
                { replacements: { amt: newAccrued, id: acc.id }, transaction: t }
            );

            totalAccrued += dailyAmount;
            results.push({
                accountNo: acc.account_no,
                balance, annualRate: annualRate * 100, dailyAmount,
                newAccruedTotal: newAccrued,
                jeId,
            });
        }

        await t.commit();
        res.json({
            status: true,
            message: `✅ ຄິດໄລ່ດອກເບ້ຍ ${accrualDate}: ${results.length} ບັນຊີ, ລວມ ${totalAccrued.toFixed(2)} ₭`,
            data: { accrualDate, totalAccrued: totalAccrued.toFixed(2), accountCount: results.length, details: results },
        });
    } catch (err) {
        await t.rollback();
        console.error('❌ Accrue error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// POST /api/deposit-interest/pay-monthly
// ═══════════════════════════════════════════
router.post('/deposit-interest/pay-monthly', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const payDate = req.body.date || new Date().toISOString().split('T')[0];

        // Get savings + current accounts with accrued interest
        const [accounts] = await sequelize.query(`
            SELECT da.id, da.account_no, da.current_balance, da.accrued_interest,
                   da.product_id, dp.interest_rate, dp.term_months
            FROM deposit_accounts da
            JOIN deposit_products dp ON da.product_id = dp.id
            WHERE da.account_status = 'ACTIVE'
              AND dp.term_months = 0
              AND da.accrued_interest > 0
        `, { transaction: t });

        const results = [];
        let totalPaid = 0;
        let totalWHT = 0;

        for (const acc of accounts) {
            const grossInterest = parseFloat(acc.accrued_interest);
            if (grossInterest <= 0) continue;

            const wht = Math.round(grossInterest * WHT_RATE * 100) / 100;
            const netInterest = grossInterest - wht;
            const coaMap = INTEREST_COA_MAP[acc.product_id];
            if (!coaMap) continue;

            // Get branch
            const [branchRows] = await sequelize.query(
                `SELECT id, org_code FROM org_branches WHERE code = 'HQ' LIMIT 1`, { transaction: t }
            );
            const branchId = branchRows.length ? String(branchRows[0].id) : null;
            const orgCode = branchRows.length ? branchRows[0].org_code : 'MFI-001';

            // JE: Dr LIABILITY(accrued) / Cr WHT / Cr DEPOSIT(net)
            const [jeResult] = await sequelize.query(`
                INSERT INTO journal_entries
                    (reference_no, transaction_date, currency_code, total_debit, total_credit,
                     status, description, source_module, branch_id, org_code)
                VALUES (:ref, :date, 'LAK', :gross, :gross,
                        'POSTED', :desc, 'DEPOSIT_INTEREST_PAY', :branchId, :orgCode)
                RETURNING id
            `, {
                replacements: {
                    ref: `PAY-${acc.account_no}-${payDate}`,
                    date: payDate, gross: grossInterest,
                    desc: `ຈ່າຍດອກເບ້ຍ ${acc.account_no} (WHT ${wht})`,
                    branchId, orgCode,
                },
                transaction: t,
            });
            const jeId = jeResult[0].id;

            // Dr: LIABILITY (accrued interest payable)
            await sequelize.query(`
                INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                VALUES (:jeId, :liabId, 'ດອກເບ້ຍຄ້າງຈ່າຍ', :gross, 0, :branchId)
            `, { replacements: { jeId, liabId: coaMap.liabilityId, gross: grossInterest, branchId }, transaction: t });

            // Cr: WHT tax
            if (wht > 0) {
                await sequelize.query(`
                    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                    VALUES (:jeId, :whtId, 'ອາກອນ WHT 10%', 0, :wht, :branchId)
                `, { replacements: { jeId, whtId: INTEREST_COA_MAP._whtCoaId, wht, branchId }, transaction: t });
            }

            // Cr: Deposit account (net amount added to balance)
            await sequelize.query(`
                INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                VALUES (:jeId, :depId, 'ດອກເບ້ຍເຂົ້າບັນຊີ (ສຸດທິ)', 0, :net, :branchId)
            `, { replacements: { jeId, depId: coaMap.depositId, net: netInterest, branchId }, transaction: t });

            // Update balance + reset accrued
            const newBalance = parseFloat(acc.current_balance) + netInterest;
            await sequelize.query(`
                UPDATE deposit_accounts
                SET current_balance = :bal, accrued_interest = 0, updated_at = NOW()
                WHERE id = :id
            `, { replacements: { bal: newBalance, id: acc.id }, transaction: t });

            // Record transaction
            await sequelize.query(`
                INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                VALUES (:accId, 'INTEREST', :net, :bal, :ref, :remark)
            `, {
                replacements: {
                    accId: acc.id, net: netInterest, bal: newBalance,
                    ref: `PAY-${acc.account_no}-${payDate}`,
                    remark: `ດອກເບ້ຍ ${grossInterest} - WHT ${wht} = ${netInterest}`,
                },
                transaction: t,
            });

            // Update accrual records status
            await sequelize.query(`
                UPDATE deposit_interest_accruals SET status = 'PAID' WHERE account_id = :id AND status = 'ACCRUED'
            `, { replacements: { id: acc.id }, transaction: t });

            totalPaid += netInterest;
            totalWHT += wht;
            results.push({
                accountNo: acc.account_no, grossInterest, wht, netInterest,
                newBalance, jeId,
            });
        }

        await t.commit();
        res.json({
            status: true,
            message: `✅ ຈ່າຍດອກເບ້ຍ ${results.length} ບັນຊີ: ລວມ ${totalPaid.toFixed(2)} ₭ (WHT: ${totalWHT.toFixed(2)} ₭)`,
            data: { payDate, totalPaid: totalPaid.toFixed(2), totalWHT: totalWHT.toFixed(2), details: results },
        });
    } catch (err) {
        await t.rollback();
        console.error('❌ Pay-monthly error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// POST /api/deposit-interest/mature
// ═══════════════════════════════════════════
router.post('/deposit-interest/mature', requirePermission('ແກ້ໄຂເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const matureDate = req.body.date || new Date().toISOString().split('T')[0];

        // Get matured fixed-term accounts
        const [accounts] = await sequelize.query(`
            SELECT da.id, da.account_no, da.current_balance, da.accrued_interest,
                   da.product_id, da.maturity_date
            FROM deposit_accounts da
            JOIN deposit_products dp ON da.product_id = dp.id
            WHERE da.account_status = 'ACTIVE'
              AND dp.term_months > 0
              AND da.maturity_date IS NOT NULL
              AND da.maturity_date <= :date
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

            const [branchRows] = await sequelize.query(
                `SELECT id, org_code FROM org_branches WHERE code = 'HQ' LIMIT 1`, { transaction: t }
            );
            const branchId = branchRows.length ? String(branchRows[0].id) : null;
            const orgCode = branchRows.length ? branchRows[0].org_code : 'MFI-001';

            // JE: Dr LIABILITY(interest) + Dr LIABILITY(deposit) / Cr WHT + Cr CASH
            const totalDebit = grossInterest + principal;
            const [jeResult] = await sequelize.query(`
                INSERT INTO journal_entries
                    (reference_no, transaction_date, currency_code, total_debit, total_credit,
                     status, description, source_module, branch_id, org_code)
                VALUES (:ref, :date, 'LAK', :total, :total,
                        'POSTED', :desc, 'DEPOSIT_MATURITY', :branchId, :orgCode)
                RETURNING id
            `, {
                replacements: {
                    ref: `MAT-${acc.account_no}`,
                    date: matureDate, total: totalDebit,
                    desc: `ຄົບກຳນົດ ${acc.account_no}: ຕົ້ນ ${principal} + ດອກເບ້ຍ ${netInterest}`,
                    branchId, orgCode,
                },
                transaction: t,
            });
            const jeId = jeResult[0].id;

            // Dr: Accrued Interest Payable
            if (grossInterest > 0) {
                await sequelize.query(`
                    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                    VALUES (:jeId, :liabId, 'ດອກເບ້ຍຄ້າງຈ່າຍ', :amt, 0, :branchId)
                `, { replacements: { jeId, liabId: coaMap.liabilityId, amt: grossInterest, branchId }, transaction: t });
            }

            // Dr: Deposit Liability (return principal)
            await sequelize.query(`
                INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                VALUES (:jeId, :depId, 'ຄືນເງິນຕົ້ນ', :amt, 0, :branchId)
            `, { replacements: { jeId, depId: coaMap.depositId, amt: principal, branchId }, transaction: t });

            // Cr: WHT
            if (wht > 0) {
                await sequelize.query(`
                    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                    VALUES (:jeId, :whtId, 'ອາກອນ WHT 10%', 0, :wht, :branchId)
                `, { replacements: { jeId, whtId: INTEREST_COA_MAP._whtCoaId, wht, branchId }, transaction: t });
            }

            // Cr: Cash (total payout)
            await sequelize.query(`
                INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, branch_id)
                VALUES (:jeId, :cashId, 'ຈ່າຍເງິນສົດ', 0, :payout, :branchId)
            `, { replacements: { jeId, cashId: CASH_COA_ID, payout: totalPayout, branchId }, transaction: t });

            // Update account status
            await sequelize.query(`
                UPDATE deposit_accounts
                SET account_status = 'MATURED', current_balance = 0, accrued_interest = 0, updated_at = NOW()
                WHERE id = :id
            `, { replacements: { id: acc.id }, transaction: t });

            // Record transaction
            await sequelize.query(`
                INSERT INTO deposit_transactions (account_id, transaction_type, amount, balance_after, reference_no, remarks)
                VALUES (:accId, 'MATURITY', :payout, 0, :ref, :remark)
            `, {
                replacements: {
                    accId: acc.id, payout: totalPayout,
                    ref: `MAT-${acc.account_no}`,
                    remark: `ຄົບກຳນົດ: ຕົ້ນ ${principal} + ດອກເບ້ຍ ${netInterest} - WHT ${wht}`,
                },
                transaction: t,
            });

            results.push({
                accountNo: acc.account_no, principal, grossInterest, wht, netInterest,
                totalPayout, jeId,
            });
        }

        await t.commit();
        res.json({
            status: true,
            message: `✅ ດຳເນີນການຄົບກຳນົດ ${results.length} ບັນຊີ`,
            data: { matureDate, details: results },
        });
    } catch (err) {
        await t.rollback();
        console.error('❌ Mature error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
