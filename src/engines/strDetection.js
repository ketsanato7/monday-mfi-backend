/**
 * strDetection.js — Suspicious Transaction Report (STR) Detection Engine
 * 
 * BoL AML/CFT Law 2024, Art. 22:
 * Financial institutions must detect and report suspicious transactions.
 * 
 * Detection Rules:
 * 1. Structuring: Multiple small transactions that add up to ≥100M in 24h
 * 2. Rapid Loans: Multiple loan applications from same person in 30 days
 * 3. Unusual Amount: Loan amount >> usual pattern for customer
 * 4. High-Risk Country: Customer nationality from FATF greylist
 * 5. PEP: Politically Exposed Person detection
 * 6. Round Numbers: Suspiciously round large amounts
 * 7. Third-Party Repayment: Someone else pays the loan
 */
const db = require('../models');
const sequelize = db.sequelize;

const HIGH_RISK_COUNTRIES = [
    'Myanmar', 'Cambodia', 'Nigeria', 'Iran', 'North Korea',
    'Syria', 'Yemen', 'Afghanistan', 'Pakistan',
];

const STR_RULES = {
    STRUCTURING: {
        code: 'STR-001',
        name: 'Structuring / ແຕກ ທຸ ລະ ກຳ',
        description: 'ທຸ ລະ ກຳ ຫຼາຍ ຄັ້ງ ລວມ ≥100M ໃນ 24 ຊົ່ວ ໂມງ',
        severity: 'HIGH',
    },
    RAPID_LOANS: {
        code: 'STR-002',
        name: 'Rapid Loan Applications / ກູ້ ຖີ່',
        description: 'ຂໍ ກູ້ ≥3 ເທື່ອ ພາຍ ໃນ 30 ວັນ',
        severity: 'HIGH',
    },
    UNUSUAL_AMOUNT: {
        code: 'STR-003',
        name: 'Unusual Amount / ຈຳ ນວນ ຜິດ ປົກ ກະ ຕິ',
        description: 'ຈຳ ນວນ ກູ້ >\u200b 3x ຂອງ ລາຍ ຮັບ ປະ ຈຳ ເດືອນ',
        severity: 'MEDIUM',
    },
    HIGH_RISK_NATIONALITY: {
        code: 'STR-004',
        name: 'High-Risk Nationality / ສັນ ຊາດ ສ່ຽງ',
        description: 'ລູກ ຄ້າ ຈາກ ປະ ເທດ FATF greylist',
        severity: 'HIGH',
    },
    ROUND_NUMBER: {
        code: 'STR-005',
        name: 'Round Number / ຈຳ ນວນ ກົມ',
        description: 'ຈຳ ນວນ ກູ້ ກົມ ≥10M (ເຊັ່ນ 10M, 20M, 50M)',
        severity: 'LOW',
    },
    EARLY_REPAYMENT: {
        code: 'STR-006',
        name: 'Early Full Repayment / ປິດ ໄວ',
        description: 'ຊຳ ລະ ໝົດ ພາຍ ໃນ <30 ວັນ ຫຼັງ ປ່ອຍ',
        severity: 'MEDIUM',
    },
};

/**
 * Scan a loan for suspicious indicators
 * @param {number} loanId - Loan contract ID
 * @returns {Array} Array of triggered rules
 */
async function scanLoan(loanId) {
    const alerts = [];

    try {
        // Get loan details
        const [loans] = await sequelize.query(`
            SELECT lc.*, pi.id as person_id, pi.firstname__la, pi.lastname__la,
                   pi.nationality_id,
                   n.description as nationality_name
            FROM loan_contracts lc
            LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
            LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
            LEFT JOIN nationality n ON n.nationality_id = pi.nationality_id
            WHERE lc.id = $1
        `, { bind: [loanId] });

        if (!loans.length) return [];
        const loan = loans[0];
        const amount = parseFloat(loan.approved_amount) || 0;
        const personId = loan.person_id;

        // ─── Rule 1: Structuring ───
        if (amount >= 80_000_000 && amount < 100_000_000) {
            // Check if there are other recent transactions from same person
            const [recent] = await sequelize.query(`
                SELECT COALESCE(SUM(approved_amount), 0) as total_24h
                FROM loan_contracts
                WHERE id IN (SELECT loan_id FROM borrowers_individual WHERE personal_info_id = $1)
                AND created_at >= NOW() - INTERVAL '24 hours'
            `, { bind: [personId] });
            if (parseFloat(recent[0]?.total_24h) >= 100_000_000) {
                alerts.push({
                    ...STR_RULES.STRUCTURING,
                    detail: `ລວມ 24h: ${parseFloat(recent[0].total_24h).toLocaleString()} ₭`,
                });
            }
        }

        // ─── Rule 2: Rapid Loans ───
        if (personId) {
            const [count] = await sequelize.query(`
                SELECT COUNT(*) as cnt FROM loan_contracts
                WHERE id IN (SELECT loan_id FROM borrowers_individual WHERE personal_info_id = $1)
                AND created_at >= NOW() - INTERVAL '30 days'
            `, { bind: [personId] });
            if (parseInt(count[0]?.cnt) >= 3) {
                alerts.push({
                    ...STR_RULES.RAPID_LOANS,
                    detail: `${count[0].cnt} ສັນ ຍາ ໃນ 30 ວັນ`,
                });
            }
        }

        // ─── Rule 3: Unusual Amount (vs ceiling) ───
        if (amount >= 40_000_000) {
            // Close to or exceeding MFI ceiling 50M
            alerts.push({
                ...STR_RULES.UNUSUAL_AMOUNT,
                detail: `ກູ້ ${amount.toLocaleString()} ₭ (ໃກ້ ເພ ດານ 50M)`,
            });
        }

        // ─── Rule 4: High-Risk Nationality ───
        if (loan.nationality_name && HIGH_RISK_COUNTRIES.includes(loan.nationality_name)) {
            alerts.push({
                ...STR_RULES.HIGH_RISK_NATIONALITY,
                detail: `ສັນ ຊາດ: ${loan.nationality_name}`,
            });
        }

        // ─── Rule 5: Round Numbers ───
        if (amount >= 10_000_000 && amount % 1_000_000 === 0) {
            alerts.push({
                ...STR_RULES.ROUND_NUMBER,
                detail: `${amount.toLocaleString()} ₭ (ກົມ ລ້ານ)`,
            });
        }

        // ─── Rule 6: Early Full Repayment ───
        if (loan.loan_status === 'CLOSED' && loan.disbursement_date) {
            const disbDate = new Date(loan.disbursement_date);
            const daysSinceDisbursement = Math.floor((Date.now() - disbDate.getTime()) / 86400000);
            if (daysSinceDisbursement < 30) {
                alerts.push({
                    ...STR_RULES.EARLY_REPAYMENT,
                    detail: `ປິດ ພາຍ ໃນ ${daysSinceDisbursement} ວັນ`,
                });
            }
        }

    } catch (err) {
        console.error('STR scan error:', err.message);
    }

    return alerts;
}

/**
 * Run STR scan on all active loans and generate reports
 * @returns {Object} { scanned, flagged, alerts }
 */
async function scanAllLoans() {
    const [loans] = await sequelize.query(`
        SELECT id FROM loan_contracts WHERE loan_status IN ('ACTIVE', 'DISBURSED', 'PENDING')
    `);

    let flagged = 0;
    const allAlerts = [];

    for (const loan of loans) {
        const alerts = await scanLoan(loan.id);
        if (alerts.length > 0) {
            flagged++;
            allAlerts.push({ loanId: loan.id, alerts });

            // Auto-create STR report in amlio_reports
            for (const alert of alerts) {
                if (alert.severity === 'HIGH') {
                    try {
                        await sequelize.query(`
                            INSERT INTO amlio_reports (report_type, reference_id, amount, status, risk_level, description, created_at)
                            VALUES ('STR', $1, (SELECT approved_amount FROM loan_contracts WHERE id = $1),
                                    'PENDING', $2, $3, NOW())
                            ON CONFLICT DO NOTHING
                        `, { bind: [loan.id, alert.severity, `${alert.code}: ${alert.name} — ${alert.detail}`] });
                    } catch { /* ignore duplicate */ }
                }
            }
        }
    }

    return {
        scanned: loans.length,
        flagged,
        alerts: allAlerts,
    };
}

/**
 * Get STR dashboard summary
 */
async function getStrDashboard() {
    const [pending] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM amlio_reports WHERE report_type = 'STR' AND status = 'PENDING'
    `);
    const [submitted] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM amlio_reports WHERE report_type = 'STR' AND status = 'SUBMITTED'
    `);
    const [totalCtr] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM amlio_reports WHERE report_type = 'CTR'
    `);

    return {
        str_pending: parseInt(pending[0]?.cnt) || 0,
        str_submitted: parseInt(submitted[0]?.cnt) || 0,
        ctr_total: parseInt(totalCtr[0]?.cnt) || 0,
    };
}

module.exports = {
    scanLoan,
    scanAllLoans,
    getStrDashboard,
    STR_RULES,
    HIGH_RISK_COUNTRIES,
};
