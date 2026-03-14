/**
 * bolReport.service.js — BoL IIF XML Export (Sections A1, A2, B1, C1)
 */
const db = require('../models');
const { QueryTypes } = require('sequelize');

function fmtDate(d) { if (!d) return ''; const dt = new Date(d); return isNaN(dt) ? '' : dt.toISOString().slice(0, 10).replace(/-/g, ''); }
function fmtDateTime(d) { if (!d) return ''; const dt = new Date(d); return isNaN(dt) ? '' : dt.toISOString().slice(0, 19).replace(/[-:T]/g, ''); }
function esc(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }

class BolReportService {
    static async getA1() { return { success: true, data: await db.sequelize.query('SELECT * FROM view_iff_a1_individuals ORDER BY id', { type: QueryTypes.SELECT }), get total() { return this.data.length; } }; }
    static async getA2() { return { success: true, data: await db.sequelize.query('SELECT * FROM view_iff_a2_enterprises ORDER BY id', { type: QueryTypes.SELECT }), get total() { return this.data.length; } }; }
    static async getB1() { return { success: true, data: await db.sequelize.query('SELECT * FROM view_iff_b1_loans ORDER BY id', { type: QueryTypes.SELECT }), get total() { return this.data.length; } }; }
    static async getC1() { return { success: true, data: await db.sequelize.query('SELECT * FROM view_iff_c1_collaterals ORDER BY id', { type: QueryTypes.SELECT }), get total() { return this.data.length; } }; }

    static async generateXml(period) {
        period = period || new Date().toISOString().slice(0, 7);
        const [header] = await db.sequelize.query('SELECT * FROM iif_headers ORDER BY created_at DESC LIMIT 1', { type: QueryTypes.SELECT });
        const [reportInfo] = await db.sequelize.query('SELECT * FROM report_info LIMIT 1', { type: QueryTypes.SELECT });
        const bankCode = (header && header.bank_code) || (reportInfo && reportInfo.mfi_id) || 'UNKNOWN';
        const submissionPeriod = period.replace('-', '');
        const [a1, a2, b1, c1] = await Promise.all([
            db.sequelize.query('SELECT * FROM view_iff_a1_individuals ORDER BY id', { type: QueryTypes.SELECT }),
            db.sequelize.query('SELECT * FROM view_iff_a2_enterprises ORDER BY id', { type: QueryTypes.SELECT }),
            db.sequelize.query('SELECT * FROM view_iff_b1_loans ORDER BY id', { type: QueryTypes.SELECT }),
            db.sequelize.query('SELECT * FROM view_iff_c1_collaterals ORDER BY id', { type: QueryTypes.SELECT }),
        ]);
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<IIF>\n';
        xml += `  <Header>\n    <BankCode>${esc(bankCode)}</BankCode>\n    <SubmissionPeriod>${esc(submissionPeriod)}</SubmissionPeriod>\n    <TotalARecords>${a1.length + a2.length}</TotalARecords>\n    <TotalBRecords>${b1.length}</TotalBRecords>\n    <TotalCRecords>${c1.length}</TotalCRecords>\n  </Header>\n`;
        for (const r of a1) xml += `  <A1>\n    <BankCustomerID>${esc(r.bank_customer_id)}</BankCustomerID>\n    <BranchIDCode>${esc(r.branch_id_code)}</BranchIDCode>\n    <GroupID>${esc(r.group_id)}</GroupID>\n    <HeadOfGroup>${r.head_of_group ? 'Y' : 'N'}</HeadOfGroup>\n    <NationalID>${esc(r.national_id)}</NationalID>\n    <NationalIDExpiry>${fmtDate(r.national_id_expiry)}</NationalIDExpiry>\n    <PassportNo>${esc(r.passport_no)}</PassportNo>\n    <PassportExpiry>${fmtDate(r.passport_expiry)}</PassportExpiry>\n    <FamilyBookNo>${esc(r.family_book_no)}</FamilyBookNo>\n    <FamilyBookProvinceCode>${esc(r.familybook_province_code)}</FamilyBookProvinceCode>\n    <FamilyBookIssueDate>${fmtDate(r.familybook_issue_date)}</FamilyBookIssueDate>\n    <Birthdate>${fmtDate(r.birthdate)}</Birthdate>\n    <FirstnameEN>${esc(r.firstname_en)}</FirstnameEN>\n    <SecondNameEN>${esc(r.second_name_en)}</SecondNameEN>\n    <LastnameEN>${esc(r.lastname_en)}</LastnameEN>\n    <FirstnameLA>${esc(r.firstname_la)}</FirstnameLA>\n    <LastnameLA>${esc(r.lastname_la)}</LastnameLA>\n    <OldSurnameEN>${esc(r.old_surname_en)}</OldSurnameEN>\n    <OldSurnameLA>${esc(r.old_surname_la)}</OldSurnameLA>\n    <NationalityCode>${esc(r.nationality_code)}</NationalityCode>\n    <Gender>${esc(r.gender)}</Gender>\n    <CivilStatus>${esc(r.civil_status)}</CivilStatus>\n    <SpouseFirstnameEN>${esc(r.spouse_firstname_en)}</SpouseFirstnameEN>\n    <SpouseSecondNameEN>${esc(r.spouse_second_name_en)}</SpouseSecondNameEN>\n    <SpouseSurnameEN>${esc(r.spouse_surname_en)}</SpouseSurnameEN>\n    <SpouseFirstnameLA>${esc(r.spouse_firstname_la)}</SpouseFirstnameLA>\n    <SpouseSurnameLA>${esc(r.spouse_surname_la)}</SpouseSurnameLA>\n    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n  </A1>\n`;
        for (const r of a2) xml += `  <A2>\n    <BankCustomerID>${esc(r.bank_customer_id)}</BankCustomerID>\n    <BranchIDCode>${esc(r.branch_id_code)}</BranchIDCode>\n    <EnterpriseCode>${esc(r.enterprise_code)}</EnterpriseCode>\n    <RegistrationDate>${fmtDate(r.registration_date)}</RegistrationDate>\n    <PlaceOfIssue>${esc(r.place_of_issue)}</PlaceOfIssue>\n    <NameEN>${esc(r.name_en)}</NameEN>\n    <NameLA>${esc(r.name_la)}</NameLA>\n    <TaxNo>${esc(r.tax_no)}</TaxNo>\n    <CategoryCode>${esc(r.category_code)}</CategoryCode>\n    <ShareholderGender>${esc(r.shareholder_gender)}</ShareholderGender>\n    <ShareholderFirstnameEN>${esc(r.shareholder_firstname_en)}</ShareholderFirstnameEN>\n    <ShareholderSecondNameEN>${esc(r.shareholder_second_name_en)}</ShareholderSecondNameEN>\n    <ShareholderSurnameEN>${esc(r.shareholder_surname_en)}</ShareholderSurnameEN>\n    <ShareholderFirstnameLA>${esc(r.shareholder_firstname_la)}</ShareholderFirstnameLA>\n    <ShareholderSurnameLA>${esc(r.shareholder_surname_la)}</ShareholderSurnameLA>\n    <ManagerGender>${esc(r.manager_gender)}</ManagerGender>\n    <ManagerFirstnameEN>${esc(r.manager_firstname_en)}</ManagerFirstnameEN>\n    <ManagerSecondNameEN>${esc(r.manager_second_name_en)}</ManagerSecondNameEN>\n    <ManagerSurnameEN>${esc(r.manager_surname_en)}</ManagerSurnameEN>\n    <ManagerFirstnameLA>${esc(r.manager_firstname_la)}</ManagerFirstnameLA>\n    <ManagerSurnameLA>${esc(r.manager_surname_la)}</ManagerSurnameLA>\n    <RegulatoryCapital>${r.regulatory_capital || ''}</RegulatoryCapital>\n    <RegulatoryCapitalCurrency>${esc(r.regulatory_capital_currency)}</RegulatoryCapitalCurrency>\n    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n  </A2>\n`;
        for (const r of b1) xml += `  <B1>\n    <BankCustomerID>${esc(r.bank_customer_id)}</BankCustomerID>\n    <BranchIDCode>${esc(r.branch_id_code)}</BranchIDCode>\n    <LoanID>${esc(r.loan_id)}</LoanID>\n    <OpenDate>${fmtDate(r.open_date)}</OpenDate>\n    <ExpiryDate>${fmtDate(r.expiry_date)}</ExpiryDate>\n    <ExtensionDate>${fmtDate(r.extension_date)}</ExtensionDate>\n    <InterestRate>${r.interest_rate || ''}</InterestRate>\n    <PurposeCode>${esc(r.purpose_code)}</PurposeCode>\n    <CreditLine>${r.credit_line || ''}</CreditLine>\n    <CurrencyCode>${esc(r.currency_code)}</CurrencyCode>\n    <OutstandingBalance>${r.outstanding_balance || ''}</OutstandingBalance>\n    <AccountNumber>${esc(r.account_number)}</AccountNumber>\n    <DaysSlow>${r.days_slow || 0}</DaysSlow>\n    <LoanClass>${esc(r.loan_class)}</LoanClass>\n    <LoanType>${esc(r.loan_type)}</LoanType>\n    <LoanTerm>${r.loan_term || ''}</LoanTerm>\n    <LoanStatus>${esc(r.loan_status)}</LoanStatus>\n    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n  </B1>\n`;
        for (const r of c1) xml += `  <C1>\n    <BankCustomerID>${esc(r.bank_customer_id)}</BankCustomerID>\n    <BranchIDCode>${esc(r.branch_id_code)}</BranchIDCode>\n    <LoanID>${esc(r.loan_id)}</LoanID>\n    <CollateralID>${esc(r.collateral_id)}</CollateralID>\n    <OwnerGender>${esc(r.owner_gender)}</OwnerGender>\n    <OwnerFirstnameEN>${esc(r.owner_firstname_en)}</OwnerFirstnameEN>\n    <OwnerFirstnameLA>${esc(r.owner_firstname_la)}</OwnerFirstnameLA>\n    <CollateralType>${esc(r.collateral_type)}</CollateralType>\n    <CollateralValue>${r.collateral_value || ''}</CollateralValue>\n    <ValueCurrency>${esc(r.value_currency)}</ValueCurrency>\n    <CollateralStatus>${esc(r.collateral_status)}</CollateralStatus>\n    <DateTimeUpdated>${fmtDateTime(r.date_time_updated)}</DateTimeUpdated>\n  </C1>\n`;
        xml += '</IIF>\n';
        return { xml, filename: `IIF_${bankCode}_${submissionPeriod}.xml` };
    }

    static async report(period) {
        period = period || new Date().toISOString().slice(0, 7);
        const [header] = await db.sequelize.query('SELECT * FROM iif_headers ORDER BY created_at DESC LIMIT 1', { type: QueryTypes.SELECT });
        const [reportInfo] = await db.sequelize.query('SELECT * FROM report_info LIMIT 1', { type: QueryTypes.SELECT });
        const [a1] = await db.sequelize.query('SELECT COUNT(*) AS count FROM view_iff_a1_individuals', { type: QueryTypes.SELECT });
        const [a2] = await db.sequelize.query('SELECT COUNT(*) AS count FROM view_iff_a2_enterprises', { type: QueryTypes.SELECT });
        const [b1] = await db.sequelize.query('SELECT COUNT(*) AS count FROM view_iff_b1_loans', { type: QueryTypes.SELECT });
        const [c1] = await db.sequelize.query('SELECT COUNT(*) AS count FROM view_iff_c1_collaterals', { type: QueryTypes.SELECT });
        return { success: true, period, bank_code: (header && header.bank_code) || (reportInfo && reportInfo.mfi_id) || null, sections: { A1_individuals: parseInt(a1.count), A2_enterprises: parseInt(a2.count), B1_loans: parseInt(b1.count), C1_collaterals: parseInt(c1.count) }, download_url: `/api/bol/xml?period=${period}` };
    }
}

module.exports = BolReportService;
