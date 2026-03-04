/**
 * loan-lifecycle.routes.js — Q1-Q7 Loan Lifecycle
 *
 * Q1: POST /api/loan-lifecycle/disburse      — ເບີກຈ່າຍ
 * Q5: POST /api/loan-lifecycle/restructure    — ປັບໂຄງສ້າງ
 * Q6: POST /api/loan-lifecycle/write-off      — ຕັດໜີ້ສູນ
 * Q7: POST /api/loan-lifecycle/extend         — ຂະຫຍາຍ
 *
 * ═══ FK Constraints (from 116-table analysis) ═══
 * journal_entries.created_by → users.id (nullable) — USE NULL
 * loan_transactions: NO journal_entry_id column
 * loan_contracts: 10 FKs (product, classification, type, purpose, ...)
 * COA: Dr 110 (id=1), Cr 1101 (id=2), loan 1203121 (id=222), allowance 12893 (id=379)
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;
const { requirePermission } = require('../middleware/rbac');

// ═══ Helper: create balanced JE ═══
async function createJE(t, { module, amount, drAccountId, crAccountId, desc, refNo, contractId }) {
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

// ═══ Helper: generate schedule installments ═══
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

// ═══════════════════════════════════════════
// Q1: ເບີກຈ່າຍ (Disburse)
// JE: Dr 110 (id=1) / Cr 1101 (id=2)
// ═══════════════════════════════════════════
router.post('/loan-lifecycle/disburse', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { contractId } = req.body;
        if (!contractId) throw new Error('ກະລຸນາລະບຸ contractId');

        const [contracts] = await sequelize.query(
            `SELECT lc.*, lp.interest_rate_type FROM loan_contracts lc
             JOIN loan_products lp ON lp.id = lc.product_id
             WHERE lc.id = :id`, { replacements: { id: contractId }, transaction: t }
        );
        if (!contracts.length) throw new Error('ບໍ່ພົບສັນຍາ');
        const c = contracts[0];

        if (c.loan_status !== 'APPROVED' && c.loan_status !== 'PENDING')
            throw new Error(`ສະຖານະ ${c.loan_status} ບໍ່ສາມາດເບີກຈ່າຍ`);

        const amount = parseFloat(c.approved_amount);
        const refNo = `DISB-${c.contract_no}-${Date.now().toString().slice(-5)}`;

        // JE: Dr 110 / Cr 1101 (same as existing LOAN pattern)
        const jeId = await createJE(t, {
            module: 'LOAN_DISBURSEMENT', amount,
            drAccountId: 1, crAccountId: 2,
            desc: `ເບີກຈ່າຍ ${c.contract_no}`, refNo, contractId,
        });

        // UPDATE loan_contracts → ACTIVE
        await sequelize.query(`
            UPDATE loan_contracts SET
                loan_status = 'ACTIVE', disbursement_date = CURRENT_DATE,
                maturity_date = CURRENT_DATE + (:months || ' months')::INTERVAL,
                remaining_balance = :amount, classification_id = 1, days_past_due = 0,
                updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: contractId, amount, months: c.term_months }, transaction: t });

        // Generate schedules if none exist
        const [existing] = await sequelize.query(
            `SELECT COUNT(*) AS cnt FROM loan_repayment_schedules WHERE contract_id = :id`,
            { replacements: { id: contractId }, transaction: t }
        );
        let schedCount = 0;
        if (parseInt(existing[0].cnt) === 0) {
            const scheds = generateSchedules(amount, parseFloat(c.interest_rate), c.term_months, new Date(), c.interest_rate_type);
            for (const s of scheds) {
                await sequelize.query(`
                    INSERT INTO loan_repayment_schedules
                        (contract_id, installment_no, due_date, principal_due, interest_due,
                         total_amount, paid_amount, paid_principal, paid_interest,
                         penalty_amount, paid_penalty, is_paid, status, created_at)
                    VALUES (:cid, :no, :due, :princ, :int, :total, 0, 0, 0, 0, 0, false, 'SCHEDULED', NOW())
                `, {
                    replacements: {
                        cid: contractId, no: s.installment, due: s.due.toISOString().split('T')[0],
                        princ: s.principal, int: s.interest, total: s.total,
                    },
                    transaction: t,
                });
            }
            schedCount = scheds.length;
        }

        // loan_transactions — exact schema: 11 cols, no created_at, no journal_entry_id
        await sequelize.query(`
            INSERT INTO loan_transactions
                (contract_id, transaction_type, transaction_date, amount_paid,
                 principal_paid, interest_paid, penalty_paid, payment_method, reference_no)
            VALUES (:cid, 'DISBURSEMENT', CURRENT_DATE, :amount, :amount, 0, 0, 'CASH', :ref)
        `, { replacements: { cid: contractId, amount, ref: refNo }, transaction: t });

        // loan_approval_history
        await sequelize.query(`
            INSERT INTO loan_approval_history
                (contract_id, user_id, action, from_status, to_status, comments, created_at)
            VALUES (:cid, 3, 'DISBURSED', :from, 'ACTIVE', :comment, NOW())
        `, { replacements: { cid: contractId, from: c.loan_status, comment: `JE#${jeId} ${refNo}` }, transaction: t });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ເບີກຈ່າຍ ${c.contract_no}: ${amount.toLocaleString()} ₭ (JE#${jeId}, ${schedCount} ງວດ)`,
            data: { contractNo: c.contract_no, amount, jeId, schedules: schedCount },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// Q5: ປັບໂຄງສ້າງ (Restructure)
// No JE — just reschedule
// ═══════════════════════════════════════════
router.post('/loan-lifecycle/restructure', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { contractId, newTermMonths, newInterestRate } = req.body;
        if (!contractId || !newTermMonths) throw new Error('ກະລຸນາລະບຸ contractId + newTermMonths');

        const [contracts] = await sequelize.query(
            `SELECT lc.*, lp.interest_rate_type FROM loan_contracts lc
             JOIN loan_products lp ON lp.id = lc.product_id
             WHERE lc.id = :id AND lc.loan_status = 'ACTIVE'`,
            { replacements: { id: contractId }, transaction: t }
        );
        if (!contracts.length) throw new Error('ບໍ່ພົບສັນຍາ ACTIVE');
        const c = contracts[0];

        const remaining = parseFloat(c.remaining_balance);
        const rate = newInterestRate || parseFloat(c.interest_rate);

        // Delete old unpaid schedules
        const [deleted] = await sequelize.query(`
            DELETE FROM loan_repayment_schedules
            WHERE contract_id = :id AND status = 'SCHEDULED' RETURNING id
        `, { replacements: { id: contractId }, transaction: t });

        // Find max existing installment_no
        const [maxInst] = await sequelize.query(
            `SELECT COALESCE(MAX(installment_no), 0) AS max_no FROM loan_repayment_schedules WHERE contract_id = :id`,
            { replacements: { id: contractId }, transaction: t }
        );
        const startNo = parseInt(maxInst[0].max_no) + 1;

        // Generate new schedules from remaining balance
        const scheds = generateSchedules(remaining, rate, newTermMonths, new Date(), c.interest_rate_type);
        for (let i = 0; i < scheds.length; i++) {
            const s = scheds[i];
            await sequelize.query(`
                INSERT INTO loan_repayment_schedules
                    (contract_id, installment_no, due_date, principal_due, interest_due,
                     total_amount, paid_amount, paid_principal, paid_interest,
                     penalty_amount, paid_penalty, is_paid, status, created_at)
                VALUES (:cid, :no, :due, :princ, :int, :total, 0, 0, 0, 0, 0, false, 'SCHEDULED', NOW())
            `, {
                replacements: {
                    cid: contractId, no: startNo + i, due: s.due.toISOString().split('T')[0],
                    princ: s.principal, int: s.interest, total: s.total,
                },
                transaction: t,
            });
        }

        // Update contract
        await sequelize.query(`
            UPDATE loan_contracts SET
                term_months = :term, interest_rate = :rate,
                maturity_date = CURRENT_DATE + (:term || ' months')::INTERVAL,
                days_past_due = 0, classification_id = 1, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: contractId, term: newTermMonths, rate }, transaction: t });

        // Approval history
        await sequelize.query(`
            INSERT INTO loan_approval_history
                (contract_id, user_id, action, from_status, to_status, comments, created_at)
            VALUES (:cid, 3, 'RESTRUCTURED', 'ACTIVE', 'ACTIVE', :comment, NOW())
        `, { replacements: { cid: contractId, comment: `${deleted.length} ງວດເກົ່າ → ${scheds.length} ງວດໃໝ່ (${rate}%)` }, transaction: t });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ປັບໂຄງສ້າງ ${c.contract_no}: ${deleted.length} ງວດເກົ່າ → ${scheds.length} ງວດໃໝ່ (${rate}%)`,
            data: { contractNo: c.contract_no, oldDeleted: deleted.length, newCreated: scheds.length, newRate: rate },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// Q6: ຕັດໜີ້ສູນ (Write-off)
// JE: Dr 12893 (id=379 allowance) / Cr 1203121 (id=222 loan)
// ═══════════════════════════════════════════
router.post('/loan-lifecycle/write-off', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { contractId } = req.body;
        if (!contractId) throw new Error('ກະລຸນາລະບຸ contractId');

        const [contracts] = await sequelize.query(
            `SELECT lc.*, lcl.code AS npl_grade FROM loan_contracts lc
             LEFT JOIN loan_classifications lcl ON lcl.id = lc.classification_id
             WHERE lc.id = :id AND lc.loan_status = 'ACTIVE'`,
            { replacements: { id: contractId }, transaction: t }
        );
        if (!contracts.length) throw new Error('ບໍ່ພົບສັນຍາ ACTIVE');
        const c = contracts[0];

        if (c.npl_grade !== 'E' && c.days_past_due < 180)
            throw new Error(`ສັນຍາ ${c.contract_no} ຍັງບໍ່ Grade E (DPD=${c.days_past_due})`);

        const amount = parseFloat(c.remaining_balance);
        const refNo = `WO-${c.contract_no}-${Date.now().toString().slice(-5)}`;

        // JE: Dr 12893 (allowance id=379) / Cr 1203121 (loan id=222)
        const jeId = await createJE(t, {
            module: 'LOAN_WRITEOFF', amount,
            drAccountId: 379, crAccountId: 222,
            desc: `ຕັດໜີ້ສູນ ${c.contract_no}`, refNo, contractId,
        });

        // Update contract
        await sequelize.query(`
            UPDATE loan_contracts SET
                loan_status = 'WRITTEN_OFF', remaining_balance = 0, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: contractId }, transaction: t });

        // Cancel remaining schedules
        const [cancelled] = await sequelize.query(`
            UPDATE loan_repayment_schedules SET status = 'CANCELLED'
            WHERE contract_id = :id AND status IN ('SCHEDULED','PARTIAL') RETURNING id
        `, { replacements: { id: contractId }, transaction: t });

        // loan_transactions — exact schema: no created_at, no journal_entry_id
        await sequelize.query(`
            INSERT INTO loan_transactions
                (contract_id, transaction_type, transaction_date, amount_paid,
                 principal_paid, interest_paid, penalty_paid, payment_method, reference_no)
            VALUES (:cid, 'WRITE_OFF', CURRENT_DATE, :amount, :amount, 0, 0, 'SYSTEM', :ref)
        `, { replacements: { cid: contractId, amount, ref: refNo }, transaction: t });

        // Approval history
        await sequelize.query(`
            INSERT INTO loan_approval_history
                (contract_id, user_id, action, from_status, to_status, comments, created_at)
            VALUES (:cid, 3, 'WRITTEN_OFF', 'ACTIVE', 'WRITTEN_OFF', :comment, NOW())
        `, { replacements: { cid: contractId, comment: `JE#${jeId} ${amount.toLocaleString()}₭ (${cancelled.length} ງວດ cancelled)` }, transaction: t });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ຕັດໜີ້ສູນ ${c.contract_no}: ${amount.toLocaleString()} ₭ (JE#${jeId}, ${cancelled.length} ງວດ cancelled)`,
            data: { contractNo: c.contract_no, amount, jeId, cancelledSchedules: cancelled.length },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// Q7: ຂະຫຍາຍ (Extension)
// No JE — just add schedules
// ═══════════════════════════════════════════
router.post('/loan-lifecycle/extend', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { contractId, extraMonths } = req.body;
        if (!contractId || !extraMonths) throw new Error('ກະລຸນາລະບຸ contractId + extraMonths');

        const [contracts] = await sequelize.query(
            `SELECT lc.*, lp.interest_rate_type FROM loan_contracts lc
             JOIN loan_products lp ON lp.id = lc.product_id
             WHERE lc.id = :id AND lc.loan_status = 'ACTIVE'`,
            { replacements: { id: contractId }, transaction: t }
        );
        if (!contracts.length) throw new Error('ບໍ່ພົບສັນຍາ ACTIVE');
        const c = contracts[0];

        // Get last scheduled due date
        const [lastSched] = await sequelize.query(
            `SELECT MAX(due_date) AS last_due FROM loan_repayment_schedules WHERE contract_id = :id`,
            { replacements: { id: contractId }, transaction: t }
        );
        const lastDue = new Date(lastSched[0].last_due);

        // Get remaining balance + max installment
        const remaining = parseFloat(c.remaining_balance);
        const rate = parseFloat(c.interest_rate);
        const [maxInst] = await sequelize.query(
            `SELECT COALESCE(MAX(installment_no), 0) AS max_no FROM loan_repayment_schedules WHERE contract_id = :id`,
            { replacements: { id: contractId }, transaction: t }
        );
        const startNo = parseInt(maxInst[0].max_no) + 1;

        // Generate extra schedules
        const scheds = generateSchedules(remaining, rate, extraMonths, lastDue, c.interest_rate_type);
        for (let i = 0; i < scheds.length; i++) {
            const s = scheds[i];
            await sequelize.query(`
                INSERT INTO loan_repayment_schedules
                    (contract_id, installment_no, due_date, principal_due, interest_due,
                     total_amount, paid_amount, paid_principal, paid_interest,
                     penalty_amount, paid_penalty, is_paid, status, created_at)
                VALUES (:cid, :no, :due, :princ, :int, :total, 0, 0, 0, 0, 0, false, 'SCHEDULED', NOW())
            `, {
                replacements: {
                    cid: contractId, no: startNo + i, due: s.due.toISOString().split('T')[0],
                    princ: s.principal, int: s.interest, total: s.total,
                },
                transaction: t,
            });
        }

        // Update contract
        const newTerm = c.term_months + extraMonths;
        const newMaturity = new Date(lastDue);
        newMaturity.setMonth(newMaturity.getMonth() + extraMonths);

        await sequelize.query(`
            UPDATE loan_contracts SET
                term_months = :term, maturity_date = :maturity, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: contractId, term: newTerm, maturity: newMaturity.toISOString().split('T')[0] }, transaction: t });

        // Approval history
        await sequelize.query(`
            INSERT INTO loan_approval_history
                (contract_id, user_id, action, from_status, to_status, comments, created_at)
            VALUES (:cid, 3, 'EXTENDED', 'ACTIVE', 'ACTIVE', :comment, NOW())
        `, { replacements: { cid: contractId, comment: `+${extraMonths} ເດືອນ (${scheds.length} ງວດໃໝ່)` }, transaction: t });

        await t.commit();
        res.json({
            status: true,
            message: `✅ ຂະຫຍາຍ ${c.contract_no}: +${extraMonths} ເດືອນ (${scheds.length} ງວດໃໝ່, term=${newTerm})`,
            data: { contractNo: c.contract_no, extraMonths, newSchedules: scheds.length, newTerm },
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
