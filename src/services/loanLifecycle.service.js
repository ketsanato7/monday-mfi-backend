/**
 * LoanLifecycleService — ລວມ logic ຈາກ loan-lifecycle.routes.js
 * ═══════════════════════════════════════════════════════════════
 * ❌ ກ່ອນ: 401 ແຖວ (raw SQL + try/catch ຊ້ຳ)
 * ✅ ຫຼັງ: Clean service + shared utils
 *
 * Endpoints:
 *   Q1: disburse    — ເບີກຈ່າຍ
 *   Q5: restructure — ປັບໂຄງສ້າງ
 *   Q6: writeOff    — ຕັດໜີ້ສູນ
 *   Q7: extend      — ຂະຫຍາຍ
 */
const { AppError } = require('../middleware/asyncHandler');
const { withTransaction } = require('../utils/transaction');
const { createJE, generateSchedules, addApprovalHistory, addLoanTransaction } = require('../utils/loan.utils');

class LoanLifecycleService {
    constructor(db) {
        this.db = db;
        this.sequelize = db.sequelize;
    }

    /**
     * ດຶງ contract + product info
     */
    async _getContract(contractId, requiredStatus, t) {
        const [contracts] = await this.sequelize.query(
            `SELECT lc.*, lp.interest_rate_type FROM loan_contracts lc
             JOIN loan_products lp ON lp.id = lc.product_id
             WHERE lc.id = :id` + (requiredStatus ? ` AND lc.loan_status = :status` : ''),
            { replacements: { id: contractId, status: requiredStatus }, transaction: t }
        );
        if (!contracts.length) throw new AppError(`ບໍ່ພົບສັນຍາ${requiredStatus ? ` ${requiredStatus}` : ''}`, 404);
        return contracts[0];
    }

    /**
     * ເພີ່ມ schedules ເຂົ້າ DB
     */
    async _insertSchedules(contractId, schedules, startNo, t) {
        for (let i = 0; i < schedules.length; i++) {
            const s = schedules[i];
            await this.sequelize.query(`
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
    }

    // ═══════════════════════════════════════
    // Q1: ເບີກຈ່າຍ (Disburse)
    // ═══════════════════════════════════════
    async disburse(contractId, userId) {
        if (!contractId) throw new AppError('ກະລຸນາລະບຸ contractId');

        return withTransaction(this.sequelize, async (t) => {
            const c = await this._getContract(contractId, null, t);
            if (c.loan_status !== 'APPROVED' && c.loan_status !== 'PENDING')
                throw new AppError(`ສະຖານະ ${c.loan_status} ບໍ່ສາມາດເບີກຈ່າຍ`);

            const amount = parseFloat(c.approved_amount);
            const refNo = `DISB-${c.contract_no}-${Date.now().toString().slice(-5)}`;

            // JE: Dr 110 / Cr 1101
            const jeId = await createJE(this.sequelize, t, {
                module: 'LOAN_DISBURSEMENT', amount,
                drAccountId: 1, crAccountId: 2,
                desc: `ເບີກຈ່າຍ ${c.contract_no}`, refNo, contractId,
            });

            // Update contract → ACTIVE
            await this.sequelize.query(`
                UPDATE loan_contracts SET
                    loan_status = 'ACTIVE', disbursement_date = CURRENT_DATE,
                    maturity_date = CURRENT_DATE + (:months || ' months')::INTERVAL,
                    remaining_balance = :amount, classification_id = 1, days_past_due = 0, updated_at = NOW()
                WHERE id = :id
            `, { replacements: { id: contractId, amount, months: c.term_months }, transaction: t });

            // Generate schedules if none exist
            let schedCount = 0;
            const [existing] = await this.sequelize.query(
                `SELECT COUNT(*) AS cnt FROM loan_repayment_schedules WHERE contract_id = :id`,
                { replacements: { id: contractId }, transaction: t }
            );
            if (parseInt(existing[0].cnt) === 0) {
                const scheds = generateSchedules(amount, parseFloat(c.interest_rate), c.term_months, new Date(), c.interest_rate_type);
                await this._insertSchedules(contractId, scheds, 1, t);
                schedCount = scheds.length;
            }

            await addLoanTransaction(this.sequelize, t, { contractId, type: 'DISBURSEMENT', amount, principal: amount, refNo });
            await addApprovalHistory(this.sequelize, t, { contractId, userId, action: 'DISBURSED', fromStatus: c.loan_status, toStatus: 'ACTIVE', comment: `JE#${jeId} ${refNo}` });

            return { contractNo: c.contract_no, amount, jeId, schedules: schedCount,
                message: `✅ ເບີກຈ່າຍ ${c.contract_no}: ${amount.toLocaleString()} ₭ (JE#${jeId}, ${schedCount} ງວດ)` };
        });
    }

    // ═══════════════════════════════════════
    // Q5: ປັບໂຄງສ້າງ (Restructure)
    // ═══════════════════════════════════════
    async restructure(contractId, newTermMonths, newInterestRate, userId) {
        if (!contractId || !newTermMonths) throw new AppError('ກະລຸນາລະບຸ contractId + newTermMonths');

        return withTransaction(this.sequelize, async (t) => {
            const c = await this._getContract(contractId, 'ACTIVE', t);
            const remaining = parseFloat(c.remaining_balance);
            const rate = newInterestRate || parseFloat(c.interest_rate);

            // Delete old unpaid schedules
            const [deleted] = await this.sequelize.query(
                `DELETE FROM loan_repayment_schedules WHERE contract_id = :id AND status = 'SCHEDULED' RETURNING id`,
                { replacements: { id: contractId }, transaction: t }
            );

            // Find max existing installment_no
            const [maxInst] = await this.sequelize.query(
                `SELECT COALESCE(MAX(installment_no), 0) AS max_no FROM loan_repayment_schedules WHERE contract_id = :id`,
                { replacements: { id: contractId }, transaction: t }
            );
            const startNo = parseInt(maxInst[0].max_no) + 1;

            const scheds = generateSchedules(remaining, rate, newTermMonths, new Date(), c.interest_rate_type);
            await this._insertSchedules(contractId, scheds, startNo, t);

            await this.sequelize.query(`
                UPDATE loan_contracts SET
                    term_months = :term, interest_rate = :rate,
                    maturity_date = CURRENT_DATE + (:term || ' months')::INTERVAL,
                    days_past_due = 0, classification_id = 1, updated_at = NOW()
                WHERE id = :id
            `, { replacements: { id: contractId, term: newTermMonths, rate }, transaction: t });

            await addApprovalHistory(this.sequelize, t, { contractId, userId, action: 'RESTRUCTURED', fromStatus: 'ACTIVE', toStatus: 'ACTIVE',
                comment: `${deleted.length} ງວດເກົ່າ → ${scheds.length} ງວດໃໝ່ (${rate}%)` });

            return { contractNo: c.contract_no, oldDeleted: deleted.length, newCreated: scheds.length, newRate: rate,
                message: `✅ ປັບໂຄງສ້າງ ${c.contract_no}: ${deleted.length} ງວດເກົ່າ → ${scheds.length} ງວດໃໝ່ (${rate}%)` };
        });
    }

    // ═══════════════════════════════════════
    // Q6: ຕັດໜີ້ສູນ (Write-off)
    // ═══════════════════════════════════════
    async writeOff(contractId, userId) {
        if (!contractId) throw new AppError('ກະລຸນາລະບຸ contractId');

        return withTransaction(this.sequelize, async (t) => {
            const [contracts] = await this.sequelize.query(
                `SELECT lc.*, lcl.code AS npl_grade FROM loan_contracts lc
                 LEFT JOIN loan_classifications lcl ON lcl.id = lc.classification_id
                 WHERE lc.id = :id AND lc.loan_status = 'ACTIVE'`,
                { replacements: { id: contractId }, transaction: t }
            );
            if (!contracts.length) throw new AppError('ບໍ່ພົບສັນຍາ ACTIVE');
            const c = contracts[0];

            if (c.npl_grade !== 'E' && c.days_past_due < 180)
                throw new AppError(`ສັນຍາ ${c.contract_no} ຍັງບໍ່ Grade E (DPD=${c.days_past_due})`);

            const amount = parseFloat(c.remaining_balance);
            const refNo = `WO-${c.contract_no}-${Date.now().toString().slice(-5)}`;

            // JE: Dr 12893 (allowance) / Cr 1203121 (loan)
            const jeId = await createJE(this.sequelize, t, { module: 'LOAN_WRITEOFF', amount, drAccountId: 379, crAccountId: 222, desc: `ຕັດໜີ້ສູນ ${c.contract_no}`, refNo, contractId });

            await this.sequelize.query(`UPDATE loan_contracts SET loan_status = 'WRITTEN_OFF', remaining_balance = 0, updated_at = NOW() WHERE id = :id`, { replacements: { id: contractId }, transaction: t });
            const [cancelled] = await this.sequelize.query(`UPDATE loan_repayment_schedules SET status = 'CANCELLED' WHERE contract_id = :id AND status IN ('SCHEDULED','PARTIAL') RETURNING id`, { replacements: { id: contractId }, transaction: t });

            await addLoanTransaction(this.sequelize, t, { contractId, type: 'WRITE_OFF', amount, principal: amount, method: 'SYSTEM', refNo });
            await addApprovalHistory(this.sequelize, t, { contractId, userId, action: 'WRITTEN_OFF', fromStatus: 'ACTIVE', toStatus: 'WRITTEN_OFF', comment: `JE#${jeId} ${amount.toLocaleString()}₭ (${cancelled.length} ງວດ cancelled)` });

            return { contractNo: c.contract_no, amount, jeId, cancelledSchedules: cancelled.length,
                message: `✅ ຕັດໜີ້ສູນ ${c.contract_no}: ${amount.toLocaleString()} ₭ (JE#${jeId}, ${cancelled.length} ງວດ cancelled)` };
        });
    }

    // ═══════════════════════════════════════
    // Q7: ຂະຫຍາຍ (Extension)
    // ═══════════════════════════════════════
    async extend(contractId, extraMonths, userId) {
        if (!contractId || !extraMonths) throw new AppError('ກະລຸນາລະບຸ contractId + extraMonths');

        return withTransaction(this.sequelize, async (t) => {
            const c = await this._getContract(contractId, 'ACTIVE', t);

            const [lastSched] = await this.sequelize.query(`SELECT MAX(due_date) AS last_due FROM loan_repayment_schedules WHERE contract_id = :id`, { replacements: { id: contractId }, transaction: t });
            const lastDue = new Date(lastSched[0].last_due);

            const remaining = parseFloat(c.remaining_balance);
            const rate = parseFloat(c.interest_rate);
            const [maxInst] = await this.sequelize.query(`SELECT COALESCE(MAX(installment_no), 0) AS max_no FROM loan_repayment_schedules WHERE contract_id = :id`, { replacements: { id: contractId }, transaction: t });
            const startNo = parseInt(maxInst[0].max_no) + 1;

            const scheds = generateSchedules(remaining, rate, extraMonths, lastDue, c.interest_rate_type);
            await this._insertSchedules(contractId, scheds, startNo, t);

            const newTerm = c.term_months + extraMonths;
            const newMaturity = new Date(lastDue);
            newMaturity.setMonth(newMaturity.getMonth() + extraMonths);

            await this.sequelize.query(`UPDATE loan_contracts SET term_months = :term, maturity_date = :maturity, updated_at = NOW() WHERE id = :id`,
                { replacements: { id: contractId, term: newTerm, maturity: newMaturity.toISOString().split('T')[0] }, transaction: t });

            await addApprovalHistory(this.sequelize, t, { contractId, userId, action: 'EXTENDED', fromStatus: 'ACTIVE', toStatus: 'ACTIVE', comment: `+${extraMonths} ເດືອນ (${scheds.length} ງວດໃໝ່)` });

            return { contractNo: c.contract_no, extraMonths, newSchedules: scheds.length, newTerm,
                message: `✅ ຂະຫຍາຍ ${c.contract_no}: +${extraMonths} ເດືອນ (${scheds.length} ງວດໃໝ່, term=${newTerm})` };
        });
    }
}

module.exports = LoanLifecycleService;
