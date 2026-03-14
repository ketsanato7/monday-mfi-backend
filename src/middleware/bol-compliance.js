/**
 * bol-compliance.js — BoL Decree 184/G Compliance Middleware
 * 
 * ① validateLoanCeiling(amount)            → ≤50M ₭
 * ② validateApprovalLimit(amount, roleId)  → loan_approval_limits table
 * ③ checkBlacklist(personalInfoId)         → customer_blacklists table
 * ④ createCTRReport(...)                   → amlio_reports table (≥100M ₭)
 * ⑤ calculateDTI(personalInfoId, installment) → DTI ratio ≤40%
 */
const logger = require('../config/logger');
const db = require('../models');
const sequelize = db.sequelize;

// ═══════════════════════════════════════════
// BoL Decree 184/G Constants
// ═══════════════════════════════════════════
const BOL_LIMITS = {
    MAX_LOAN_AMOUNT: 50_000_000,           // 50M ₭ — MFI ceiling
    BRANCH_INDIVIDUAL: 10_000_000,          // 10M ₭ — branch limit per individual
    BRANCH_GROUP: 20_000_000,               // 20M ₭ — branch limit per group
    MAX_GROUPS_PER_BRANCH: 10,
    DECLINING_BALANCE_THRESHOLD: 5_000_000, // 5M ₭ — must use declining balance
    CTR_THRESHOLD: 100_000_000,             // 100M ₭ — AMLIO CTR reporting
    DTI_MAX_RATIO: 0.40,                    // 40% — Debt-to-Income max
};

// ═══════════════════════════════════════════
// ① Loan Ceiling Validation (BoL 184/G)
// ═══════════════════════════════════════════
function validateLoanCeiling(amount) {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
        return { valid: false, message: 'ຈຳນວນເງິນກູ້ ຕ້ອງ > 0' };
    }
    if (numAmount > BOL_LIMITS.MAX_LOAN_AMOUNT) {
        return {
            valid: false,
            message: `❌ ເກີນເພດານ BoL Decree 184/G: ${numAmount.toLocaleString()} ₭ > ${BOL_LIMITS.MAX_LOAN_AMOUNT.toLocaleString()} ₭ (50 ລ້ານ)`,
            code: 'BOL_CEILING_EXCEEDED',
            limit: BOL_LIMITS.MAX_LOAN_AMOUNT,
            requested: numAmount,
        };
    }
    return { valid: true };
}

// ═══════════════════════════════════════════
// ② Approval Limit by Role (loan_approval_limits)
// ═══════════════════════════════════════════
async function validateApprovalLimit(amount, roleId) {
    const numAmount = parseFloat(amount) || 0;
    const userRoleId = roleId || 2; // default = ເຈົ້າໜ້າທີ່ສິນເຊື່ອ

    try {
        const [limits] = await sequelize.query(
            `SELECT max_amount, description FROM loan_approval_limits WHERE role_id = :roleId LIMIT 1`,
            { replacements: { roleId: userRoleId } }
        );

        if (!limits.length) {
            return {
                valid: false,
                message: `❌ ບໍ່ພົບ ສິດ ອະນຸມັດ ສຳລັບ role_id=${userRoleId}`,
                code: 'NO_APPROVAL_LIMIT',
            };
        }

        const maxAmount = parseFloat(limits[0].max_amount);
        if (numAmount > maxAmount) {
            return {
                valid: false,
                message: `❌ ເກີນ ສິດ ອະນຸມັດ: ${numAmount.toLocaleString()} ₭ > ${maxAmount.toLocaleString()} ₭ (${limits[0].description})`,
                code: 'APPROVAL_LIMIT_EXCEEDED',
                limit: maxAmount,
                description: limits[0].description,
            };
        }

        return { valid: true, maxAmount, description: limits[0].description };
    } catch (err) {
        logger.error('❌ validateApprovalLimit error:', err.message);
        // FAIL-CLOSED: ບໍ່ສາມາດກວດ approval limit → ຕ້ອງ block (Banking compliance)
        return { valid: false, message: 'ບໍ່ສາມາດກວດ approval limit — ກະລຸນາລອງໃໝ່', code: 'APPROVAL_CHECK_FAILED' };
    }
}

// ═══════════════════════════════════════════
// ③ Blacklist Check (customer_blacklists)
// ═══════════════════════════════════════════
async function checkBlacklist(personalInfoId) {
    if (!personalInfoId) return { blocked: false };

    try {
        const [rows] = await sequelize.query(
            `SELECT id, reason, blacklisted_date FROM customer_blacklists 
             WHERE customer_id = :pid AND is_active = true AND (removed_date IS NULL)`,
            { replacements: { pid: personalInfoId } }
        );

        if (rows.length > 0) {
            return {
                blocked: true,
                reason: `🚫 ລູກຄ້າ ຢູ່ ໃນ ບັນຊີດຳ: ${rows[0].reason} (ວັນທີ: ${rows[0].blacklisted_date})`,
                code: 'BLACKLISTED',
                blacklistId: rows[0].id,
            };
        }

        return { blocked: false };
    } catch (err) {
        logger.error('❌ checkBlacklist error:', err.message);
        // FAIL-CLOSED: ບໍ່ສາມາດກວດ blacklist → ຕ້ອງ block (AML/CFT compliance)
        return { blocked: true, reason: 'ບໍ່ສາມາດກວດ blacklist — ກະລຸນາລອງໃໝ່', code: 'BLACKLIST_CHECK_FAILED' };
    }
}

// ═══════════════════════════════════════════
// ④ CTR Report to AMLIO (amlio_reports)
// ═══════════════════════════════════════════
async function createCTRReport({ loanId, personId, enterpriseId, amount, currencyCode, orgId, transaction }) {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount < BOL_LIMITS.CTR_THRESHOLD) return { created: false, reason: 'Below CTR threshold' };

    try {
        const [result] = await sequelize.query(`
            INSERT INTO amlio_reports 
                (report_type, reference_table, reference_id, person_id, enterprise_id, 
                 amount, currency_code, risk_level, reason, status, submitted_by, org_id, created_at, updated_at)
            VALUES ('CTR', 'loan_contracts', :loanId, :personId, :enterpriseId,
                    :amount, :currency, 'HIGH', :reason, 'PENDING', 1, :orgId, NOW(), NOW())
            RETURNING id
        `, {
            replacements: {
                loanId: loanId || null,
                personId: personId || null,
                enterpriseId: enterpriseId || null,
                amount: numAmount,
                currency: currencyCode || 'LAK',
                reason: `ທຸລະກຳ ≥${BOL_LIMITS.CTR_THRESHOLD.toLocaleString()} ₭ — ລາຍງານ AMLIO ອັດຕະໂນມັດ (AML ມ.22)`,
                orgId: orgId || 1,
            },
            transaction: transaction || null,
        });

        logger.info(`✅ CTR Report created: id=${result[0]?.id} | amount=${numAmount.toLocaleString()} ₭`);
        return { created: true, reportId: result[0]?.id };
    } catch (err) {
        logger.error('❌ createCTRReport error:', err.message);
        return { created: false, error: err.message };
    }
}

// ═══════════════════════════════════════════
// ⑤ DTI Calculator (borrowers_individual)
// ═══════════════════════════════════════════
async function calculateDTI(personalInfoId, monthlyInstallment) {
    if (!personalInfoId) return { ratio: null, pass: true, message: 'No personal info' };

    try {
        const [rows] = await sequelize.query(
            `SELECT monthly_income, monthly_expense, existing_debt 
             FROM borrowers_individual WHERE personal_info_id = :pid LIMIT 1`,
            { replacements: { pid: personalInfoId } }
        );

        if (!rows.length) return { ratio: null, pass: true, message: 'ບໍ່ພົບ ຂໍ້ມູນ ລາຍຮັບ' };

        const income = parseFloat(rows[0].monthly_income) || 0;
        const expense = parseFloat(rows[0].monthly_expense) || 0;
        const existingDebt = parseFloat(rows[0].existing_debt) || 0;
        const newInstallment = parseFloat(monthlyInstallment) || 0;

        if (income <= 0) {
            return { ratio: null, pass: true, message: 'ຍັງ ບໍ່ ໄດ້ ປ້ອນ ລາຍຮັບ' };
        }

        const totalDebt = existingDebt + newInstallment;
        const ratio = totalDebt / income;
        const pass = ratio <= BOL_LIMITS.DTI_MAX_RATIO;

        return {
            ratio: Math.round(ratio * 10000) / 100, // e.g. 35.50%
            pass,
            income,
            expense,
            existingDebt,
            newInstallment,
            totalDebt,
            maxRatio: BOL_LIMITS.DTI_MAX_RATIO * 100,
            message: pass
                ? `✅ DTI ${(ratio * 100).toFixed(1)}% ≤ ${BOL_LIMITS.DTI_MAX_RATIO * 100}%`
                : `⚠️ DTI ${(ratio * 100).toFixed(1)}% > ${BOL_LIMITS.DTI_MAX_RATIO * 100}% — ຄວາມສ່ຽງ ສູງ`,
        };
    } catch (err) {
        logger.error('❌ calculateDTI error:', err.message);
        return { ratio: null, pass: true, message: err.message };
    }
}

// ═══════════════════════════════════════════
// Middleware: bolComplianceCheck (express middleware)
// ═══════════════════════════════════════════
function bolComplianceCheck(options = {}) {
    return async (req, res, next) => {
        try {
            const amount = parseFloat(req.body?.approved_amount || req.body?.amount || 0);

            // Ceiling check
            if (options.checkCeiling !== false) {
                const ceiling = validateLoanCeiling(amount);
                if (!ceiling.valid) {
                    return res.status(400).json({ status: false, ...ceiling });
                }
            }

            // Approval limit
            if (options.checkApprovalLimit) {
                const roleId = req.user?.roleId || req.user?.role_id || 2;
                const limit = await validateApprovalLimit(amount, roleId);
                if (!limit.valid) {
                    return res.status(403).json({ status: false, ...limit });
                }
            }

            next();
        } catch (err) {
            logger.error('BoL compliance middleware error:', err);
            // FAIL-CLOSED: BoL compliance check ລົ້ມເຫຼວ → ຕ້ອງ block (Banking regulation)
            return res.status(500).json({
                status: false,
                message: 'ບໍ່ສາມາດກວດ BoL compliance — ກະລຸນາລອງໃໝ່',
                code: 'BOL_CHECK_FAILED',
            });
        }
    };
}

module.exports = {
    BOL_LIMITS,
    validateLoanCeiling,
    validateApprovalLimit,
    checkBlacklist,
    createCTRReport,
    calculateDTI,
    bolComplianceCheck,
};
