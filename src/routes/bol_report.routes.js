/**
 * bol_report.routes.js — BoL IIF XML Export API
 * 
 * ສ້າງ XML ຕາມ format BoL (ທະນາຄານແຫ່ງ ສປປ ລາວ)
 * ແລະ LCIC (ສູນຂໍ້ມູນສິນເຊື່ອ)
 * 
 * GET /api/bol/report?period=2026-01    → BoL XML Report (ທັງໝົດ)
 * GET /api/bol/a1                       → JSON: ລູກຄ້າບຸກຄົນ
 * GET /api/bol/a2                       → JSON: ລູກຄ້ານິຕິບຸກຄົນ
 * GET /api/bol/b1                       → JSON: ສິນເຊື່ອ
 * GET /api/bol/c1                       → JSON: ຫຼັກຊັບ
 * GET /api/bol/xml?period=2026-01       → Download XML file
 */
const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const db = require('../models');

// ─── Helper: Format date as YYYYMMDD ───
function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toISOString().slice(0, 10).replace(/-/g, '');
}

// ─── Helper: Format datetime as YYYYMMDDHHmmss ───
function fmtDateTime(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toISOString().slice(0, 19).replace(/[-:T]/g, '');
}

// ─── Helper: Escape XML special characters ───
function escXml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ═══════════════════════════════════════════
// JSON endpoints — ດຶງ data ຈາກ views
// ═══════════════════════════════════════════

// GET /api/bol/a1 — ລູກຄ້າບຸກຄົນ
router.get('/bol/a1', async (req, res) => {
    try {
        const rows = await db.sequelize.query(
            'SELECT * FROM view_iff_a1_individuals ORDER BY id',
            { type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/bol/a2 — ລູກຄ້ານິຕິບຸກຄົນ
router.get('/bol/a2', async (req, res) => {
    try {
        const rows = await db.sequelize.query(
            'SELECT * FROM view_iff_a2_enterprises ORDER BY id',
            { type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/bol/b1 — ສິນເຊື່ອ
router.get('/bol/b1', async (req, res) => {
    try {
        const rows = await db.sequelize.query(
            'SELECT * FROM view_iff_b1_loans ORDER BY id',
            { type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/bol/c1 — ຫຼັກຊັບ
router.get('/bol/c1', async (req, res) => {
    try {
        const rows = await db.sequelize.query(
            'SELECT * FROM view_iff_c1_collaterals ORDER BY id',
            { type: QueryTypes.SELECT }
        );
        res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// XML Export — BoL IIF Format
// ═══════════════════════════════════════════

// GET /api/bol/xml?period=2026-01
router.get('/bol/xml', async (req, res) => {
    try {
        const period = req.query.period || new Date().toISOString().slice(0, 7);

        // ── Fetch header info ──
        const [header] = await db.sequelize.query(
            'SELECT * FROM iif_headers ORDER BY created_at DESC LIMIT 1',
            { type: QueryTypes.SELECT }
        );
        const [reportInfo] = await db.sequelize.query(
            'SELECT * FROM report_info LIMIT 1',
            { type: QueryTypes.SELECT }
        );

        const bankCode = (header && header.bank_code) || (reportInfo && reportInfo.mfi_id) || 'UNKNOWN';
        const submissionPeriod = period.replace('-', '');

        // ── Fetch all sections ──
        const [a1Rows, a2Rows, b1Rows, c1Rows] = await Promise.all([
            db.sequelize.query('SELECT * FROM view_iff_a1_individuals ORDER BY id', { type: QueryTypes.SELECT }),
            db.sequelize.query('SELECT * FROM view_iff_a2_enterprises ORDER BY id', { type: QueryTypes.SELECT }),
            db.sequelize.query('SELECT * FROM view_iff_b1_loans ORDER BY id', { type: QueryTypes.SELECT }),
            db.sequelize.query('SELECT * FROM view_iff_c1_collaterals ORDER BY id', { type: QueryTypes.SELECT }),
        ]);

        // ── Build XML ──
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<IIF>\n';

        // Header
        xml += '  <Header>\n';
        xml += `    <BankCode>${escXml(bankCode)}</BankCode>\n`;
        xml += `    <SubmissionPeriod>${escXml(submissionPeriod)}</SubmissionPeriod>\n`;
        xml += `    <TotalARecords>${a1Rows.length + a2Rows.length}</TotalARecords>\n`;
        xml += `    <TotalBRecords>${b1Rows.length}</TotalBRecords>\n`;
        xml += `    <TotalCRecords>${c1Rows.length}</TotalCRecords>\n`;
        xml += '  </Header>\n';

        // Section A1 — Individual customers
        for (const r of a1Rows) {
            xml += '  <A1>\n';
            xml += `    <BankCustomerID>${escXml(r.bank_customer_id)}</BankCustomerID>\n`;
            xml += `    <BranchIDCode>${escXml(r.branch_id_code)}</BranchIDCode>\n`;
            xml += `    <GroupID>${escXml(r.group_id)}</GroupID>\n`;
            xml += `    <HeadOfGroup>${r.head_of_group ? 'Y' : 'N'}</HeadOfGroup>\n`;
            xml += `    <NationalID>${escXml(r.national_id)}</NationalID>\n`;
            xml += `    <NationalIDExpiry>${fmtDate(r.national_id_expiry)}</NationalIDExpiry>\n`;
            xml += `    <PassportNo>${escXml(r.passport_no)}</PassportNo>\n`;
            xml += `    <PassportExpiry>${fmtDate(r.passport_expiry)}</PassportExpiry>\n`;
            xml += `    <FamilyBookNo>${escXml(r.family_book_no)}</FamilyBookNo>\n`;
            xml += `    <FamilyBookProvinceCode>${escXml(r.familybook_province_code)}</FamilyBookProvinceCode>\n`;
            xml += `    <FamilyBookIssueDate>${fmtDate(r.familybook_issue_date)}</FamilyBookIssueDate>\n`;
            xml += `    <Birthdate>${fmtDate(r.birthdate)}</Birthdate>\n`;
            xml += `    <FirstnameEN>${escXml(r.firstname_en)}</FirstnameEN>\n`;
            xml += `    <SecondNameEN>${escXml(r.second_name_en)}</SecondNameEN>\n`;
            xml += `    <LastnameEN>${escXml(r.lastname_en)}</LastnameEN>\n`;
            xml += `    <FirstnameLA>${escXml(r.firstname_la)}</FirstnameLA>\n`;
            xml += `    <LastnameLA>${escXml(r.lastname_la)}</LastnameLA>\n`;
            xml += `    <OldSurnameEN>${escXml(r.old_surname_en)}</OldSurnameEN>\n`;
            xml += `    <OldSurnameLA>${escXml(r.old_surname_la)}</OldSurnameLA>\n`;
            xml += `    <NationalityCode>${escXml(r.nationality_code)}</NationalityCode>\n`;
            xml += `    <Gender>${escXml(r.gender)}</Gender>\n`;
            xml += `    <CivilStatus>${escXml(r.civil_status)}</CivilStatus>\n`;
            xml += `    <SpouseFirstnameEN>${escXml(r.spouse_firstname_en)}</SpouseFirstnameEN>\n`;
            xml += `    <SpouseSecondNameEN>${escXml(r.spouse_second_name_en)}</SpouseSecondNameEN>\n`;
            xml += `    <SpouseSurnameEN>${escXml(r.spouse_surname_en)}</SpouseSurnameEN>\n`;
            xml += `    <SpouseFirstnameLA>${escXml(r.spouse_firstname_la)}</SpouseFirstnameLA>\n`;
            xml += `    <SpouseSurnameLA>${escXml(r.spouse_surname_la)}</SpouseSurnameLA>\n`;
            xml += `    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n`;
            xml += '  </A1>\n';
        }

        // Section A2 — Enterprise customers
        for (const r of a2Rows) {
            xml += '  <A2>\n';
            xml += `    <BankCustomerID>${escXml(r.bank_customer_id)}</BankCustomerID>\n`;
            xml += `    <BranchIDCode>${escXml(r.branch_id_code)}</BranchIDCode>\n`;
            xml += `    <EnterpriseCode>${escXml(r.enterprise_code)}</EnterpriseCode>\n`;
            xml += `    <RegistrationDate>${fmtDate(r.registration_date)}</RegistrationDate>\n`;
            xml += `    <PlaceOfIssue>${escXml(r.place_of_issue)}</PlaceOfIssue>\n`;
            xml += `    <NameEN>${escXml(r.name_en)}</NameEN>\n`;
            xml += `    <NameLA>${escXml(r.name_la)}</NameLA>\n`;
            xml += `    <TaxNo>${escXml(r.tax_no)}</TaxNo>\n`;
            xml += `    <CategoryCode>${escXml(r.category_code)}</CategoryCode>\n`;
            xml += `    <ShareholderGender>${escXml(r.shareholder_gender)}</ShareholderGender>\n`;
            xml += `    <ShareholderFirstnameEN>${escXml(r.shareholder_firstname_en)}</ShareholderFirstnameEN>\n`;
            xml += `    <ShareholderSecondNameEN>${escXml(r.shareholder_second_name_en)}</ShareholderSecondNameEN>\n`;
            xml += `    <ShareholderSurnameEN>${escXml(r.shareholder_surname_en)}</ShareholderSurnameEN>\n`;
            xml += `    <ShareholderFirstnameLA>${escXml(r.shareholder_firstname_la)}</ShareholderFirstnameLA>\n`;
            xml += `    <ShareholderSurnameLA>${escXml(r.shareholder_surname_la)}</ShareholderSurnameLA>\n`;
            xml += `    <ManagerGender>${escXml(r.manager_gender)}</ManagerGender>\n`;
            xml += `    <ManagerFirstnameEN>${escXml(r.manager_firstname_en)}</ManagerFirstnameEN>\n`;
            xml += `    <ManagerSecondNameEN>${escXml(r.manager_second_name_en)}</ManagerSecondNameEN>\n`;
            xml += `    <ManagerSurnameEN>${escXml(r.manager_surname_en)}</ManagerSurnameEN>\n`;
            xml += `    <ManagerFirstnameLA>${escXml(r.manager_firstname_la)}</ManagerFirstnameLA>\n`;
            xml += `    <ManagerSurnameLA>${escXml(r.manager_surname_la)}</ManagerSurnameLA>\n`;
            xml += `    <RegulatoryCapital>${r.regulatory_capital || ''}</RegulatoryCapital>\n`;
            xml += `    <RegulatoryCapitalCurrency>${escXml(r.regulatory_capital_currency)}</RegulatoryCapitalCurrency>\n`;
            xml += `    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n`;
            xml += '  </A2>\n';
        }

        // Section B1 — Loans
        for (const r of b1Rows) {
            xml += '  <B1>\n';
            xml += `    <BankCustomerID>${escXml(r.bank_customer_id)}</BankCustomerID>\n`;
            xml += `    <BranchIDCode>${escXml(r.branch_id_code)}</BranchIDCode>\n`;
            xml += `    <LoanID>${escXml(r.loan_id)}</LoanID>\n`;
            xml += `    <OpenDate>${fmtDate(r.open_date)}</OpenDate>\n`;
            xml += `    <ExpiryDate>${fmtDate(r.expiry_date)}</ExpiryDate>\n`;
            xml += `    <ExtensionDate>${fmtDate(r.extension_date)}</ExtensionDate>\n`;
            xml += `    <InterestRate>${r.interest_rate || ''}</InterestRate>\n`;
            xml += `    <PurposeCode>${escXml(r.purpose_code)}</PurposeCode>\n`;
            xml += `    <CreditLine>${r.credit_line || ''}</CreditLine>\n`;
            xml += `    <CurrencyCode>${escXml(r.currency_code)}</CurrencyCode>\n`;
            xml += `    <OutstandingBalance>${r.outstanding_balance || ''}</OutstandingBalance>\n`;
            xml += `    <AccountNumber>${escXml(r.account_number)}</AccountNumber>\n`;
            xml += `    <DaysSlow>${r.days_slow || 0}</DaysSlow>\n`;
            xml += `    <LoanClass>${escXml(r.loan_class)}</LoanClass>\n`;
            xml += `    <LoanType>${escXml(r.loan_type)}</LoanType>\n`;
            xml += `    <LoanTerm>${r.loan_term || ''}</LoanTerm>\n`;
            xml += `    <LoanStatus>${escXml(r.loan_status)}</LoanStatus>\n`;
            xml += `    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n`;
            xml += '  </B1>\n';
        }

        // Section C1 — Collaterals
        for (const r of c1Rows) {
            xml += '  <C1>\n';
            xml += `    <BankCustomerID>${escXml(r.bank_customer_id)}</BankCustomerID>\n`;
            xml += `    <BranchIDCode>${escXml(r.branch_id_code)}</BranchIDCode>\n`;
            xml += `    <LoanID>${escXml(r.loan_id)}</LoanID>\n`;
            xml += `    <CollateralID>${escXml(r.collateral_id)}</CollateralID>\n`;
            xml += `    <OwnerGender>${escXml(r.owner_gender)}</OwnerGender>\n`;
            xml += `    <OwnerFirstnameEN>${escXml(r.owner_firstname_en)}</OwnerFirstnameEN>\n`;
            xml += `    <OwnerFirstnameLA>${escXml(r.owner_firstname_la)}</OwnerFirstnameLA>\n`;
            xml += `    <CollateralType>${escXml(r.collateral_type)}</CollateralType>\n`;
            xml += `    <CollateralValue>${r.collateral_value || ''}</CollateralValue>\n`;
            xml += `    <ValueCurrency>${escXml(r.value_currency)}</ValueCurrency>\n`;
            xml += `    <CollateralStatus>${escXml(r.collateral_status)}</CollateralStatus>\n`;
            xml += `    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n`;
            xml += '  </C1>\n';
        }

        xml += '</IIF>\n';

        // ── Send XML response ──
        const filename = `IIF_${bankCode}_${submissionPeriod}.xml`;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(xml);
    } catch (err) {
        console.error('❌ BoL XML export error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/bol/report?period=2026-01 — JSON summary
router.get('/bol/report', async (req, res) => {
    try {
        const period = req.query.period || new Date().toISOString().slice(0, 7);

        const [header] = await db.sequelize.query(
            'SELECT * FROM iif_headers ORDER BY created_at DESC LIMIT 1',
            { type: QueryTypes.SELECT }
        );
        const [reportInfo] = await db.sequelize.query(
            'SELECT * FROM report_info LIMIT 1',
            { type: QueryTypes.SELECT }
        );

        const [a1Count] = await db.sequelize.query(
            'SELECT COUNT(*) AS count FROM view_iff_a1_individuals', { type: QueryTypes.SELECT }
        );
        const [a2Count] = await db.sequelize.query(
            'SELECT COUNT(*) AS count FROM view_iff_a2_enterprises', { type: QueryTypes.SELECT }
        );
        const [b1Count] = await db.sequelize.query(
            'SELECT COUNT(*) AS count FROM view_iff_b1_loans', { type: QueryTypes.SELECT }
        );
        const [c1Count] = await db.sequelize.query(
            'SELECT COUNT(*) AS count FROM view_iff_c1_collaterals', { type: QueryTypes.SELECT }
        );

        res.json({
            success: true,
            period,
            bank_code: (header && header.bank_code) || (reportInfo && reportInfo.mfi_id) || null,
            sections: {
                A1_individuals: parseInt(a1Count.count),
                A2_enterprises: parseInt(a2Count.count),
                B1_loans: parseInt(b1Count.count),
                C1_collaterals: parseInt(c1Count.count),
            },
            download_url: `/api/bol/xml?period=${period}`,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
