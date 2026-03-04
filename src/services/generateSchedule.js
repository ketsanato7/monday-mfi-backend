/**
 * generateSchedule.js — Backend Installment Schedule Generator
 * ═══════════════════════════════════════════════════════════════
 * Ported from frontend generateInstallmentSchedule.tsx
 * Supports 11 loan types: Flat, Declining, EMI, Interest-only, etc.
 *
 * @param {Object} params
 * @param {number} params.principal       - ວົງເງິນ
 * @param {number} params.rate            - ດອກເບ້ຍ %/ເດືອນ
 * @param {number} params.months          - ຈຳນວນງວດ
 * @param {string} params.type            - ປະເພດການຄຳນວນ (loan_type_id)
 * @param {string} params.from_date       - ວັນເລີ່ມ (DD/MM/YYYY or ISO)
 *
 * @returns {{ rows: Array, summary: Object }}
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function toNumber(v) {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return v;
    return Number(String(v).replace(/,/g, '')) || 0;
}

/**
 * Add N months to a date, return as YYYY-MM-DD (for DB storage)
 */
function addMonths(dateStr, n) {
    // Parse DD/MM/YYYY or ISO
    let d;
    if (dateStr && dateStr.includes('/')) {
        const [dd, mm, yyyy] = dateStr.split('/');
        d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    } else {
        d = dateStr ? new Date(dateStr) : new Date();
    }
    d.setMonth(d.getMonth() + n);
    // Return YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ── Known Loan Type IDs (from DB seed) ──
const TYPES = {
    FLAT: '68f8f5c5ab85ff56b6ceca1f',
    DECLINING: '68f8f68411f16ffa7082e9b0',
    EMI: '68f8fae7d59e945cb67b8652',
    INTEREST_ONLY: '6905c92a6e612b1fc7a8c7d5',
    PRINCIPAL_3M: '69050e0ae0d8cf463a6025f9',
    PRINCIPAL_6M: '69050e28e0d8cf463a6025fb',
    PRINCIPAL_12M: '6905c8db6e612b1fc7a8c7d2',
    INCREASING: '6915e665db8e67af03922f1f',
    DECLINING_INCREASING: '6915e685db8e67af03922f21',
    EMI_INCREASING: '6915e692db8e67af03922f23',
    INCREASING_PCT: '6915e6acdb8e67af03922f27',
};

function generateSchedule({ principal, rate, months, type, from_date, g = 0.05 }) {
    const P = toNumber(principal);
    const R = toNumber(rate);
    const M = toNumber(months);

    if (P <= 0 || M <= 0 || Number.isNaN(R)) {
        return { rows: [], summary: { totalPrincipal: 0, totalInterest: 0, totalPayment: 0 } };
    }

    const monthlyRate = R / 100;
    const t = type || TYPES.EMI;

    let remaining = P;
    const rows = [];

    // EMI formula
    let emi = 0;
    if (monthlyRate === 0) {
        emi = P / M;
    } else {
        const pow = Math.pow(1 + monthlyRate, M);
        emi = (P * monthlyRate * pow) / (pow - 1);
    }

    let totalPrincipal = 0;
    let totalInterest = 0;

    for (let i = 1; i <= M; i++) {
        const dueDate = addMonths(from_date, i); // YYYY-MM-DD

        let principalPay = 0;
        let interest = remaining * monthlyRate;

        switch (t) {
            case TYPES.FLAT:
                principalPay = P / M;
                interest = P * monthlyRate;
                break;

            case TYPES.DECLINING:
                principalPay = P / M;
                break;

            case TYPES.EMI:
                principalPay = Math.max(emi - interest, 0);
                break;

            case TYPES.INTEREST_ONLY:
                interest = P * monthlyRate;
                principalPay = i === M ? P : 0;
                break;

            case TYPES.PRINCIPAL_3M:
                principalPay = i % 3 === 0 ? (P / M) * 3 : 0;
                break;

            case TYPES.PRINCIPAL_6M:
                principalPay = i % 6 === 0 ? (P / M) * 6 : 0;
                break;

            case TYPES.PRINCIPAL_12M:
                principalPay = i % 12 === 0 ? (P / M) * 12 : 0;
                break;

            case TYPES.INCREASING:
                principalPay = (P / M) * (1 + (i - 1) / M);
                break;

            case TYPES.DECLINING_INCREASING:
                principalPay = P / M + (P / M) * 0.1 * (i - 1);
                break;

            case TYPES.EMI_INCREASING:
                principalPay = Math.max(emi - interest, 0);
                break;

            case TYPES.INCREASING_PCT: {
                const weights = Array.from({ length: M }, (_, j) => Math.pow(1 + g, j));
                const weightSum = weights.reduce((a, b) => a + b, 0);
                principalPay = P * (weights[i - 1] / weightSum);
                break;
            }

            default:
                principalPay = P / M;
        }

        // Last installment: pay all remaining
        if (i === M) {
            principalPay = round2(remaining);
        }

        remaining = round2(remaining - principalPay);
        if (remaining < 0) remaining = 0;

        totalPrincipal += principalPay;
        totalInterest += interest;

        rows.push({
            installment_no: i,
            due_date: dueDate,
            principal_amount: round2(principalPay),
            interest_amount: round2(interest),
            total_amount: round2(principalPay + interest),
            remaining_balance: round2(remaining),
        });
    }

    return {
        rows,
        summary: {
            totalPrincipal: round2(totalPrincipal),
            totalInterest: round2(totalInterest),
            totalPayment: round2(totalPrincipal + totalInterest),
        },
    };
}

module.exports = { generateSchedule, TYPES };
