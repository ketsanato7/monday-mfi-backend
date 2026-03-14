/**
 * loanTracking.service.js — Loan Tracking Business Logic
 * ═══════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 499 ແຖວ ໃນ loan-tracking.routes.js
 * ✅ ຫຼັງ: service ລວມ logic, route ເປັນ thin controller
 *
 * Methods: pay(), calculatePenalty(), classify(), dashboard(), schedules()
 */
const db = require('../models');
const sequelize = db.sequelize;

// ── COA Mapping ──
const CASH_COA_ID = 3;
const LOAN_COA_ID = 222;
const LOAN_COA_MID = 223;
const LOAN_COA_LONG = 224;
const INTEREST_REVENUE_ID = 1650;
const PENALTY_REVENUE_ID = 1666;

const NPL_RULES = [
    { maxDays: 30, classId: 1, code: 'A', provision: 0.01 },
    { maxDays: 60, classId: 2, code: 'B', provision: 0.03 },
    { maxDays: 90, classId: 3, code: 'C', provision: 0.20 },
    { maxDays: 180, classId: 4, code: 'D', provision: 0.50 },
    { maxDays: 99999, classId: 5, code: 'E', provision: 1.00 },
];

function getLoanCoaId(termMonths) {
    if (termMonths <= 12) return LOAN_COA_ID;
    if (termMonths <= 60) return LOAN_COA_MID;
    return LOAN_COA_LONG;
}
function refSuffix() { return String(Date.now()).slice(-6); }

async function getBranch(t) {
    const [rows] = await sequelize.query(`SELECT id, org_code FROM org_branches WHERE code = 'HQ' LIMIT 1`, { transaction: t });
    return { branchId: rows.length ? String(rows[0].id) : null, orgCode: rows.length ? rows[0].org_code : 'MFI-001' };
}

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

class LoanTrackingService {
    // ① POST pay — ຮັບຊຳລະຄ່າງວດ
    static async pay({ contractId, amount, paymentMethod }) {
        if (!contractId || !amount || amount <= 0) throw new Error('ກະລຸນາລະບຸ contractId ແລະ amount > 0');

        const t = await sequelize.transaction();
        try {
            const [contracts] = await sequelize.query(`SELECT lc.*, lp.product_name_la, lp.interest_rate_type FROM loan_contracts lc JOIN loan_products lp ON lc.product_id = lp.id WHERE lc.id = :id`, { replacements: { id: contractId }, transaction: t });
            if (!contracts.length) throw new Error('ບໍ່ພົບສັນຍາ');
            const contract = contracts[0];
            if (contract.loan_status !== 'ACTIVE') throw new Error('ສັນຍາບໍ່ ACTIVE');

            const [schedules] = await sequelize.query(`SELECT * FROM loan_repayment_schedules WHERE contract_id = :cid AND status = 'SCHEDULED' ORDER BY due_date, installment_no`, { replacements: { cid: contractId }, transaction: t });
            if (!schedules.length) throw new Error('ບໍ່ມີງວດຄ້າງ');

            let remaining = amount, totalPrincipalPaid = 0, totalInterestPaid = 0, totalPenaltyPaid = 0;
            const paidInstallments = [];

            for (const sched of schedules) {
                if (remaining <= 0) break;
                const penaltyDue = parseFloat(sched.penalty_amount || 0) - parseFloat(sched.paid_penalty || 0);
                const interestDue = parseFloat(sched.interest_due || 0) - parseFloat(sched.paid_interest || 0);
                const principalDue = parseFloat(sched.principal_due || 0) - parseFloat(sched.paid_principal || 0);

                const penaltyPay = Math.min(remaining, penaltyDue); remaining -= penaltyPay; totalPenaltyPaid += penaltyPay;
                const interestPay = Math.min(remaining, interestDue); remaining -= interestPay; totalInterestPaid += interestPay;
                const principalPay = Math.min(remaining, principalDue); remaining -= principalPay; totalPrincipalPaid += principalPay;

                const totalPaidThis = penaltyPay + interestPay + principalPay;
                const newPaidAmount = parseFloat(sched.paid_amount || 0) + totalPaidThis;
                const totalDue = parseFloat(sched.total_amount || 0) + parseFloat(sched.penalty_amount || 0);
                const isFullyPaid = newPaidAmount >= totalDue - 0.01;

                await sequelize.query(`UPDATE loan_repayment_schedules SET paid_amount = :paidAmt, paid_principal = :paidP, paid_interest = :paidI, paid_penalty = :paidPen, is_paid = :isPaid, status = CASE WHEN :isPaid THEN 'PAID' ELSE 'PARTIAL' END WHERE id = :id`,
                    { replacements: { paidAmt: newPaidAmount, paidP: parseFloat(sched.paid_principal || 0) + principalPay, paidI: parseFloat(sched.paid_interest || 0) + interestPay, paidPen: parseFloat(sched.paid_penalty || 0) + penaltyPay, isPaid: isFullyPaid, id: sched.id }, transaction: t });

                paidInstallments.push({ installmentNo: sched.installment_no, dueDate: sched.due_date, principalPaid: principalPay, interestPaid: interestPay, penaltyPaid: penaltyPay, status: isFullyPaid ? 'PAID' : 'PARTIAL' });
            }

            const newRemaining = parseFloat(contract.remaining_balance) - totalPrincipalPaid;
            const allPaid = newRemaining <= 0.01;
            await sequelize.query(`UPDATE loan_contracts SET remaining_balance = :rem, loan_status = CASE WHEN :allPaid THEN 'COMPLETED' ELSE loan_status END, updated_at = NOW() WHERE id = :id`, { replacements: { rem: Math.max(0, newRemaining), allPaid, id: contractId }, transaction: t });

            const { branchId, orgCode } = await getBranch(t);
            const today = new Date().toISOString().split('T')[0];
            const loanCoaId = getLoanCoaId(contract.term_months);
            const jeLines = [{ accountId: CASH_COA_ID, desc: 'ຮັບເງິນຊຳລະ', debit: amount, credit: 0 }];
            if (totalPrincipalPaid > 0) jeLines.push({ accountId: loanCoaId, desc: 'ຫຼຸດເງິນກູ້ (ຕົ້ນ)', debit: 0, credit: totalPrincipalPaid });
            if (totalInterestPaid > 0) jeLines.push({ accountId: INTEREST_REVENUE_ID, desc: 'ລາຍຮັບດອກເບ້ຍ', debit: 0, credit: totalInterestPaid });
            if (totalPenaltyPaid > 0) jeLines.push({ accountId: PENALTY_REVENUE_ID, desc: 'ຄ່າປັບ/ທຳນຽມ', debit: 0, credit: totalPenaltyPaid });
            if (remaining > 0) jeLines.push({ accountId: loanCoaId, desc: 'ເກີນ → ຫຼຸດຕົ້ນ', debit: 0, credit: remaining });

            const jeId = await createJE(t, { ref: `PAY-${contract.contract_no}-${refSuffix()}`, date: today, amount, desc: `ຊຳລະ ${contract.contract_no}: ຕົ້ນ ${totalPrincipalPaid} + ດອກ ${totalInterestPaid}`, module: 'LOAN_REPAYMENT', branchId, orgCode, lines: jeLines });

            await sequelize.query(`INSERT INTO loan_transactions (contract_id, transaction_date, transaction_type, amount_paid, principal_paid, interest_paid, penalty_paid, payment_method, reference_no) VALUES (:cid, NOW(), 'REPAYMENT', :amt, :pp, :ip, :penp, :pm, :ref)`,
                { replacements: { cid: contractId, amt: amount, pp: totalPrincipalPaid, ip: totalInterestPaid, penp: totalPenaltyPaid, pm: paymentMethod || 'CASH', ref: `PAY-${contract.contract_no}-${refSuffix()}` }, transaction: t });

            await t.commit();
            return { status: true, message: `✅ ຊຳລະ ${contract.contract_no}: ${amount.toLocaleString()} ₭`, data: { contractNo: contract.contract_no, amountPaid: amount, principalPaid: totalPrincipalPaid, interestPaid: totalInterestPaid, penaltyPaid: totalPenaltyPaid, overpayment: remaining, newRemainingBalance: Math.max(0, newRemaining), installmentsPaid: paidInstallments, jeId, loanCompleted: allPaid } };
        } catch (err) { await t.rollback(); throw err; }
    }

    // ② POST calculate-penalty
    static async calculatePenalty() {
        const [overdue] = await sequelize.query(`
            SELECT lrs.id, lrs.contract_id, lrs.installment_no, lrs.due_date, lrs.principal_due, lrs.penalty_amount,
                   lc.interest_rate, lc.contract_no, CURRENT_DATE - lrs.due_date AS days_overdue
            FROM loan_repayment_schedules lrs JOIN loan_contracts lc ON lc.id = lrs.contract_id
            WHERE lrs.status = 'SCHEDULED' AND lrs.due_date < CURRENT_DATE AND lc.loan_status = 'ACTIVE' ORDER BY lrs.due_date
        `);
        if (!overdue.length) return { status: true, message: 'ບໍ່ມີງວດ overdue', data: { updatedCount: 0, overdueSchedules: [] } };

        let updatedCount = 0; const results = [];
        for (const sched of overdue) {
            const daysOverdue = parseInt(sched.days_overdue);
            const penalty = Math.round(daysOverdue * (parseFloat(sched.interest_rate) * 0.5 / 100 / 365) * parseFloat(sched.principal_due) * 100) / 100;
            if (penalty !== parseFloat(sched.penalty_amount || 0)) {
                await sequelize.query(`UPDATE loan_repayment_schedules SET penalty_amount = :penalty WHERE id = :id`, { replacements: { penalty, id: sched.id } });
                updatedCount++;
            }
            results.push({ contractNo: sched.contract_no, installmentNo: sched.installment_no, dueDate: sched.due_date, daysOverdue, principalDue: parseFloat(sched.principal_due), penalty });
        }
        return { status: true, message: `✅ ຄິດຄ່າປັບ ${updatedCount} ງວດ`, data: { updatedCount, overdueSchedules: results } };
    }

    // ③ POST classify — NPL ອັດຕະໂນມັດ
    static async classify() {
        const [contracts] = await sequelize.query(`
            SELECT lc.id, lc.contract_no, lc.remaining_balance, lc.classification_id, lc.days_past_due AS current_dpd,
                   MIN(lrs.due_date) AS oldest_overdue_date,
                   CASE WHEN MIN(lrs.due_date) < CURRENT_DATE THEN CURRENT_DATE - MIN(lrs.due_date) ELSE 0 END AS calc_dpd
            FROM loan_contracts lc LEFT JOIN loan_repayment_schedules lrs ON lrs.contract_id = lc.id AND lrs.status = 'SCHEDULED'
            WHERE lc.loan_status = 'ACTIVE' GROUP BY lc.id
        `);

        let updatedCount = 0; const results = [];
        for (const c of contracts) {
            const dpd = parseInt(c.calc_dpd || 0);
            const rule = NPL_RULES.find(r => dpd <= r.maxDays) || NPL_RULES[NPL_RULES.length - 1];
            const allowance = Math.round(parseFloat(c.remaining_balance) * rule.provision * 100) / 100;
            if (rule.classId !== c.classification_id || dpd !== parseInt(c.current_dpd || 0)) {
                await sequelize.query(`UPDATE loan_contracts SET days_past_due = :dpd, classification_id = :classId, allowance_losses = :allow, classification_date = CURRENT_DATE, updated_at = NOW() WHERE id = :id`, { replacements: { dpd, classId: rule.classId, allow: allowance, id: c.id } });
                updatedCount++;
            }
            results.push({ contractNo: c.contract_no, remainingBalance: parseFloat(c.remaining_balance), daysPastDue: dpd, grade: rule.code, provisionRate: `${(rule.provision * 100).toFixed(0)}%`, allowance });
        }
        return { status: true, message: `✅ ຈັດກຸ່ມ NPL: ${updatedCount} ສັນຍາ ອັບເດດ`, data: { updatedCount, contracts: results } };
    }

    // ④ GET dashboard
    static async dashboard() {
        const [summary] = await sequelize.query(`SELECT COUNT(*) AS total_contracts, SUM(remaining_balance) AS total_outstanding, SUM(allowance_losses) AS total_allowance, COUNT(*) FILTER (WHERE days_past_due > 0) AS overdue_contracts FROM loan_contracts WHERE loan_status = 'ACTIVE'`);
        const [nplBreakdown] = await sequelize.query(`SELECT lc2.code AS grade, lc2.value AS label, COUNT(lc.id) AS count, COALESCE(SUM(lc.remaining_balance), 0) AS total_balance FROM loan_classifications lc2 LEFT JOIN loan_contracts lc ON lc.classification_id = lc2.id AND lc.loan_status = 'ACTIVE' WHERE lc2.code IN ('A','B','C','D','E') GROUP BY lc2.id, lc2.code, lc2.value ORDER BY lc2.id`);
        const [overdueSchedules] = await sequelize.query(`SELECT lrs.id, lrs.contract_id, lc.contract_no, lrs.installment_no, lrs.due_date, lrs.principal_due, lrs.interest_due, lrs.total_amount, lrs.penalty_amount, lrs.paid_amount, lrs.status, CURRENT_DATE - lrs.due_date AS days_overdue FROM loan_repayment_schedules lrs JOIN loan_contracts lc ON lc.id = lrs.contract_id WHERE lrs.status IN ('SCHEDULED','PARTIAL') AND lrs.due_date < CURRENT_DATE AND lc.loan_status = 'ACTIVE' ORDER BY lrs.due_date LIMIT 50`);
        const [upcomingSchedules] = await sequelize.query(`SELECT lrs.id, lrs.contract_id, lc.contract_no, lrs.installment_no, lrs.due_date, lrs.principal_due, lrs.interest_due, lrs.total_amount, lrs.status FROM loan_repayment_schedules lrs JOIN loan_contracts lc ON lc.id = lrs.contract_id WHERE lrs.status = 'SCHEDULED' AND lrs.due_date >= CURRENT_DATE AND lrs.due_date <= CURRENT_DATE + INTERVAL '30 days' AND lc.loan_status = 'ACTIVE' ORDER BY lrs.due_date LIMIT 50`);
        const [recentPayments] = await sequelize.query(`SELECT lt.id, lc.contract_no, lt.transaction_date, lt.transaction_type, lt.amount_paid, lt.principal_paid, lt.interest_paid, lt.penalty_paid, lt.payment_method, lt.reference_no FROM loan_transactions lt JOIN loan_contracts lc ON lc.id = lt.contract_id ORDER BY lt.id DESC LIMIT 20`);
        const [activeContracts] = await sequelize.query(`SELECT lc.id, lc.contract_no, lc.approved_amount, lc.interest_rate, lc.term_months, lc.remaining_balance, lc.days_past_due, lc.loan_status, lp.product_name_la, lcl.code AS npl_grade, lcl.value AS npl_label, lc.allowance_losses FROM loan_contracts lc JOIN loan_products lp ON lp.id = lc.product_id LEFT JOIN loan_classifications lcl ON lcl.id = lc.classification_id WHERE lc.loan_status = 'ACTIVE' ORDER BY lc.id`);

        return { status: true, data: { summary: summary[0], nplBreakdown, overdueSchedules, upcomingSchedules, recentPayments, activeContracts } };
    }

    // ⑤ GET schedules/:contractId
    static async schedules(contractId) {
        const [schedules] = await sequelize.query(`SELECT lrs.*, lc.contract_no FROM loan_repayment_schedules lrs JOIN loan_contracts lc ON lc.id = lrs.contract_id WHERE lrs.contract_id = :cid ORDER BY lrs.installment_no`, { replacements: { cid: contractId } });
        return { status: true, data: schedules };
    }
}

module.exports = LoanTrackingService;
