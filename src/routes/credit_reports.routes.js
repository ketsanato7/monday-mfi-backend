/**
 * credit_reports.routes.js
 * 
 * BOL Standard Report APIs for F04-F09
 * F04: ສິນເຊື່ອປົກກະຕິ — aggregate by classification × economic_branch × gender
 * F05-F07: Similar structure  
 * F08: ລູກຄ້າລາຍໃຫຍ່ (name + amount)
 * F09: ອັດຕາດອກເບ້ຍ (by economic_branch × term)
 */
const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const db = require('../models');

const Loan = db['loan_contracts'];
const LoanClassification = db['loan_classifications'];
const EconomicBranch = db['economic_branches'];

// ═══ BOL Economic Branches (9 fixed categories) ═══
const BOL_BRANCHES = [
    { code: '1', label: 'ອຸດສາຫະກໍາ' },
    { code: '2', label: 'ກໍ່ສ້າງ' },
    { code: '3', label: 'ປະກອບວັດຖຸເຕັກນິກ' },
    { code: '4', label: 'ກະສິກໍາ ແລະ ປ່າໄມ້' },
    { code: '5', label: 'ການຄ້າ' },
    { code: '6', label: 'ຂົນສົ່ງ ແລະ ໄປສະນີ' },
    { code: '7', label: 'ບໍລິການ' },
    { code: '8', label: 'ຫັດຖະກໍາ' },
    { code: '9', label: 'ປະເພດອື່ນໆ' },
];

// ═══ BOL Classifications (5 grades A-E) ═══
const BOL_CLASSIFICATIONS = [
    { id: 1, code: 'A', label: 'ສິນເຊື່ອປົກກະຕິ (ຊັ້ນ A)' },
    { id: 2, code: 'B', label: 'ສິນເຊື່ອຄວນເອົາໃຈໃສ່ (ຊັ້ນ B)' },
    { id: 3, code: 'C', label: 'ສິນເຊື່ອຕໍ່າກວ່າມາດຕະຖານ (ຊັ້ນ C)' },
    { id: 4, code: 'D', label: 'ສິນເຊື່ອທີ່ໜ້າສົງໃສ (ຊັ້ນ D)' },
    { id: 5, code: 'E', label: 'ສິນເຊື່ອທີ່ເປັນໜີ້ສູນ (ຊັ້ນ E)' },
];

// ═══ Helper: Build aggregate section ═══
function buildSection(loans, sectionPrefix, sectionTitle) {
    const classifications = BOL_CLASSIFICATIONS.map((cls, clsIdx) => {
        const clsLoans = loans.filter(l => l.classification_id === cls.id);
        const branches = BOL_BRANCHES.map((br, brIdx) => {
            const branchLoans = clsLoans.filter(l => l.economic_branch_id === (brIdx + 1));
            return {
                code: `${sectionPrefix}.${clsIdx + 1}.${brIdx + 1}`,
                label: br.label,
                contracts: branchLoans.length,
                amount: branchLoans.reduce((s, l) => s + parseFloat(l.remaining_balance || l.approved_amount || 0), 0),
            };
        });
        return {
            code: `${sectionPrefix}.${clsIdx + 1}`,
            label: cls.label,
            total_contracts: clsLoans.length,
            total_amount: clsLoans.reduce((s, l) => s + parseFloat(l.remaining_balance || l.approved_amount || 0), 0),
            branches,
        };
    });

    const allContracts = loans.length;
    const allAmount = loans.reduce((s, l) => s + parseFloat(l.remaining_balance || l.approved_amount || 0), 0);

    return {
        prefix: sectionPrefix,
        title: sectionTitle,
        total_contracts: allContracts,
        total_amount: allAmount,
        classifications,
    };
}

// ═══ Helper: Flatten section to BOL rows (for DataGrid display) ═══
function flattenSection(section) {
    const rows = [];
    rows.push({
        id: `${section.prefix}-total`,
        code: section.prefix === '1' ? 'I' : section.prefix === '2' ? 'II' : section.prefix === '3' ? 'III' : 'IV',
        item_name: section.title,
        contract_count: section.total_contracts,
        total_amount: section.total_amount,
        is_header: true,
    });
    section.classifications.forEach(cls => {
        rows.push({
            id: cls.code,
            code: cls.code,
            item_name: cls.label,
            contract_count: cls.total_contracts,
            total_amount: cls.total_amount,
            is_header: true,
        });
        cls.branches.forEach(br => {
            rows.push({
                id: br.code,
                code: br.code,
                item_name: br.label,
                contract_count: br.contracts,
                total_amount: br.amount,
                is_header: false,
            });
        });
    });
    return rows;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/credits/regular (F04 — BOL Standard)
// ═══════════════════════════════════════════════════════════════
router.get('/reports/credits/regular', async (req, res) => {
    try {
        const loans = await Loan.findAll({
            where: { loan_status: 'ACTIVE' },
            raw: true,
        });

        // Section I: ລວມທັງໝົດ
        const sectionAll = buildSection(loans, '1', 'ລວມທັງໝົດ');

        // TODO: Section II-IV require JOIN with borrowers to get gender
        // For now, flatten Section I for display
        const rows = flattenSection(sectionAll);

        res.json({
            success: true,
            data: rows,
            sections: [sectionAll],
            total: loans.length,
        });
    } catch (error) {
        console.error('F04 error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/credits/restructuring (F05)
// ═══════════════════════════════════════════════════════════════
router.get('/reports/credits/restructuring', async (req, res) => {
    try {
        const loans = await Loan.findAll({
            where: {
                loan_status: 'ACTIVE',
                restructured_date: { [Op.not]: null }
            },
            raw: true
        });
        const section = buildSection(loans, '1', 'ລວມທັງໝົດ');
        res.json({ success: true, data: flattenSection(section), sections: [section], total: loans.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/credits/transferred (F06)
// ═══════════════════════════════════════════════════════════════
router.get('/reports/credits/transferred', async (req, res) => {
    try {
        const loans = await Loan.findAll({
            where: { loan_status: 'TRANSFERRED' },
            raw: true
        });
        const section = buildSection(loans, '1', 'ລວມທັງໝົດ');
        res.json({ success: true, data: flattenSection(section), sections: [section], total: loans.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/credits/related-party (F07 — BOL specific labels)
// ═══════════════════════════════════════════════════════════════
const F07_CATEGORIES = [
    { code: '1', label: 'ຂາຮຸ້ນຂອງສະຖາບັນການເງິນ' },
    { code: '2', label: 'ຜູ້ອໍານວຍການຂອງສະຖາບັນການເງິນ' },
    { code: '3', label: 'ພະນັກງານຂອງສະຖາບັນການເງິນ' },
    { code: '4', label: 'ຜູ້ກວດສອບພາຍນອກ' },
    { code: '5', label: 'ສະມາຊິກຄອບຄົວທີ່ໃກ້ຊິດ' },
];

function buildF07Section(loans, prefix, title) {
    const rows = [];
    const totalContracts = loans.length;
    const totalAmount = loans.reduce((s, l) => s + parseFloat(l.remaining_balance || l.approved_amount || 0), 0);
    rows.push({
        id: `${prefix}.1`, code: `${prefix}.1`, item_name: `ລວມສິນເຊື່ອໃຫ້ແກ່ພາກສ່ວນທີ່ພົວພັນ`,
        contract_count: totalContracts, total_amount: totalAmount, is_header: true,
    });
    F07_CATEGORIES.forEach(cat => {
        // Map borrower_connection_id to category (simplified)
        const catLoans = loans.filter(l => String(l.borrower_connection_id) === cat.code);
        rows.push({
            id: `${prefix}.1.${cat.code}`, code: `${prefix}.1.${cat.code}`, item_name: cat.label,
            contract_count: catLoans.length,
            total_amount: catLoans.reduce((s, l) => s + parseFloat(l.remaining_balance || l.approved_amount || 0), 0),
            is_header: false,
        });
    });
    return rows;
}

router.get('/reports/credits/related-party', async (req, res) => {
    try {
        const loans = await Loan.findAll({
            where: { loan_status: 'ACTIVE', borrower_connection_id: { [Op.not]: null } },
            raw: true
        });
        const allRows = [];
        const sections = [
            { prefix: '1', title: 'I ລວມທັງໝົດ' },
            { prefix: '2', title: 'II ລູກຄ້າເພດຊາຍ' },
            { prefix: '3', title: 'III ລູກຄ້າເພດຍິງ' },
            { prefix: '4', title: 'IV ນິຕິບຸກຄົນ' },
        ];
        sections.forEach((sec, idx) => {
            allRows.push(...buildF07Section(idx === 0 ? loans : [], sec.prefix, sec.title));
        });
        res.json({ success: true, data: allRows, total: allRows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/credits/large-customer (F08)
// ═══════════════════════════════════════════════════════════════
router.get('/reports/credits/large-customer', async (req, res) => {
    try {
        const loans = await Loan.findAll({
            where: {
                loan_status: 'ACTIVE',
                approved_amount: { [Op.gte]: 50000000 }
            },
            raw: true
        });
        // F08 format: ຊື່ລູກຄ້າ + ຈຳນວນເງິນ
        const rows = loans.map((l, i) => ({
            id: l.id,
            code: `${i + 1}`,
            item_name: l.contract_no,
            contract_count: 1,
            total_amount: parseFloat(l.remaining_balance || l.approved_amount || 0),
        }));
        res.json({ success: true, data: rows, total: loans.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/reports/credits/interest-rate (F09)
// ═══════════════════════════════════════════════════════════════
router.get('/reports/credits/interest-rate', async (req, res) => {
    try {
        const loans = await Loan.findAll({
            where: { loan_status: 'ACTIVE' },
            raw: true
        });

        // F09: ແຍກຕາມ economic branch × term (ສັ້ນ/ກາງ/ຍາວ)
        const rows = BOL_BRANCHES.map((br, brIdx) => {
            const branchLoans = loans.filter(l => l.economic_branch_id === (brIdx + 1));
            const avgRate = branchLoans.length > 0
                ? branchLoans.reduce((s, l) => s + parseFloat(l.interest_rate || 0), 0) / branchLoans.length
                : 0;

            // Sub-rows: ໄລຍະສັ້ນ (≤12m), ກາງ (13-60m), ຍາວ (>60m)
            const shortTerm = branchLoans.filter(l => l.term_months <= 12);
            const midTerm = branchLoans.filter(l => l.term_months > 12 && l.term_months <= 60);
            const longTerm = branchLoans.filter(l => l.term_months > 60);

            const calcAvg = (arr) => arr.length > 0 ? arr.reduce((s, l) => s + parseFloat(l.interest_rate || 0), 0) / arr.length : 0;

            return [
                { id: `${brIdx + 1}`, code: `${brIdx + 1}`, item_name: br.label, avg_interest_rate: avgRate.toFixed(2), is_header: true },
                { id: `${brIdx + 1}.1`, code: `${brIdx + 1}.1`, item_name: `${br.label} ໄລຍະສັ້ນ`, avg_interest_rate: calcAvg(shortTerm).toFixed(2), is_header: false },
                { id: `${brIdx + 1}.2`, code: `${brIdx + 1}.2`, item_name: `${br.label} ໄລຍະກາງ`, avg_interest_rate: calcAvg(midTerm).toFixed(2), is_header: false },
                { id: `${brIdx + 1}.3`, code: `${brIdx + 1}.3`, item_name: `${br.label} ໄລຍະຍາວ`, avg_interest_rate: calcAvg(longTerm).toFixed(2), is_header: false },
            ];
        }).flat();

        res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
