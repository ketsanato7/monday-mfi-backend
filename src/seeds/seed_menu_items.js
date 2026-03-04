/**
 * Seed menu_items + roles + role_menus
 * ── ສ້າງ ຂໍ້ ມູນ ເມ ນູ ທັງ ໝົດ ຈາກ navigation_new.tsx ──
 *
 * ໃຊ້: node src/seeds/seed_menu_items.js
 */
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME || 'monday',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
    }
);

// ─── ທຸກ ເມ ນູ ຈາກ navigation_new.tsx ───
const MENU_TREE = [
    // ── LP Process ──
    { segment: "LP_PROCESS", title: "📋 ປ່ອຍກູ້ (LP Process)", parent: null, icon: "PaidIcon", sort: 10 },
    { segment: "LP1.customer_registration", title: "LP1 — ລົງທະບຽນ (ບຸກຄົນ)", parent: "LP_PROCESS", icon: null, sort: 1 },
    { segment: "LP1.enterprise_registration", title: "LP1b — ລົງທະບຽນ (ວິສາຫະກິດ)", parent: "LP_PROCESS", icon: null, sort: 2 },
    { segment: "LP1.group_registration", title: "LP1c — ລົງທະບຽນ (ກຸ່ມ)", parent: "LP_PROCESS", icon: null, sort: 3 },
    { segment: "LP2.blacklist_check", title: "LP2 — ກວດບັນຊີດຳ", parent: "LP_PROCESS", icon: null, sort: 4 },
    { segment: "LP3.loan_application", title: "LP3 — ຄຳຮ້ອງກູ້", parent: "LP_PROCESS", icon: null, sort: 5 },
    { segment: "LP4.collateral", title: "LP4 — ຫຼັກຊັບ", parent: "LP_PROCESS", icon: null, sort: 6 },
    { segment: "LP5.approval", title: "LP5 — ອະນຸມັດ", parent: "LP_PROCESS", icon: null, sort: 7 },
    { segment: "LP6.disbursement", title: "LP6 — ປ່ອຍເງິນ", parent: "LP_PROCESS", icon: null, sort: 8 },
    { segment: "LP7.repayment", title: "LP7 — ຊຳລະ", parent: "LP_PROCESS", icon: null, sort: 9 },
    { segment: "LP8.reporting", title: "LP8 — ລາຍງານ", parent: "LP_PROCESS", icon: null, sort: 10 },

    // ── ລາຍງານ BOL ──
    { segment: "BOL_REPORTS", title: "ລາຍງານພາກລັດ", parent: null, icon: "BusinessIcon", sort: 20 },
    { segment: "1.balance_sheet", title: "F01 ໃບດຸ່ນດ່ຽງ", parent: "BOL_REPORTS", icon: null, sort: 1 },
    { segment: "2.financial_position_statement", title: "F02 ຖານະການເງິນ", parent: "BOL_REPORTS", icon: null, sort: 2 },
    { segment: "3.operating_results_statement", title: "F03 ຜົນດຳເນີນງານ", parent: "BOL_REPORTS", icon: null, sort: 3 },
    { segment: "4.regular_credits_tatement", title: "F04 ສິນເຊື່ອປົກກະຕິ", parent: "BOL_REPORTS", icon: null, sort: 4 },
    { segment: "5.restructuring_credit_report", title: "F05 ສິນເຊື່ອປັບໂຄງສ້າງ", parent: "BOL_REPORTS", icon: null, sort: 5 },
    { segment: "6.transferred_credit_report", title: "F06 ສິນເຊື່ອໂອນຂາຍ", parent: "BOL_REPORTS", icon: null, sort: 6 },
    { segment: "7.related_party_credit_report", title: "F07 ສິນເຊື່ອຜູ້ກ່ຽວຂ້ອງ", parent: "BOL_REPORTS", icon: null, sort: 7 },
    { segment: "8.large_customer_credit_report", title: "F08 ລູກຄ້າລາຍໃຫຍ່", parent: "BOL_REPORTS", icon: null, sort: 8 },
    { segment: "9.credit_interest_rate_report", title: "F09 ອັດຕາດອກເບ້ຍສິນເຊື່ອ", parent: "BOL_REPORTS", icon: null, sort: 9 },
    { segment: "10.customer_deposit_report", title: "F10 ເງິນຝາກລູກຄ້າ", parent: "BOL_REPORTS", icon: null, sort: 10 },
    { segment: "11.deposit_interest_rate_report", title: "F11 ອັດຕາດອກເບ້ຍເງິນຝາກ", parent: "BOL_REPORTS", icon: null, sort: 11 },
    { segment: "12.member_share_report", title: "F12 ຮຸ້ນສະມາຊິກ", parent: "BOL_REPORTS", icon: null, sort: 12 },

    // ── ① ຂໍ້ມູນບຸກຄົນ ──
    { segment: "PERSONAL", title: "ຂໍ້ມູນບຸກຄົນ", parent: null, icon: "AccountCircleIcon", sort: 30 },
    { segment: "auto/personal_info", title: "ຂໍ້ມູນບຸກຄົນ", parent: "PERSONAL", icon: null, sort: 1 },
    { segment: "auto/addresses", title: "ທີ່ຢູ່", parent: "PERSONAL", icon: null, sort: 2 },
    { segment: "auto/contact_details", title: "ຂໍ້ມູນຕິດຕໍ່", parent: "PERSONAL", icon: null, sort: 3 },
    { segment: "auto/lao_id_cards", title: "ບັດປະຊາຊົນ", parent: "PERSONAL", icon: null, sort: 4 },
    { segment: "auto/passports", title: "ໜັງສືຜ່ານແດນ", parent: "PERSONAL", icon: null, sort: 5 },
    { segment: "auto/family_books", title: "ປຶ້ມສຳມະໂນ", parent: "PERSONAL", icon: null, sort: 6 },
    { segment: "auto/marriages", title: "ການແຕ່ງງານ", parent: "PERSONAL", icon: null, sort: 7 },
    { segment: "auto/personal_relationships", title: "ຄວາມສຳພັນ", parent: "PERSONAL", icon: null, sort: 8 },
    { segment: "auto/personal_surname_history", title: "ປະຫວັດນາມສະກຸນ", parent: "PERSONAL", icon: null, sort: 9 },
    { segment: "auto/health_insurance", title: "ປະກັນສຸຂະພາບ", parent: "PERSONAL", icon: null, sort: 10 },

    // ── ② ສິນເຊື່ອ ──
    { segment: "LOANS", title: "ສິນເຊື່ອ (Loans)", parent: null, icon: "PaidIcon", sort: 40 },
    { segment: "auto/loan_applications", title: "ໃບສະໝັກກູ້", parent: "LOANS", icon: null, sort: 1 },
    { segment: "auto/loan_contracts", title: "ສັນຍາເງິນກູ້", parent: "LOANS", icon: null, sort: 2 },
    { segment: "auto/loan_transactions", title: "ທຸລະກຳເງິນກູ້", parent: "LOANS", icon: null, sort: 3 },
    { segment: "auto/loan_collaterals", title: "ຫຼັກຊັບຄ້ຳປະກັນ", parent: "LOANS", icon: null, sort: 4 },
    { segment: "auto/loan_repayment_schedules", title: "ຕາຕະລາງຊຳລະ", parent: "LOANS", icon: null, sort: 5 },
    { segment: "auto/loan_products", title: "ຜະລິດຕະພັນເງິນກູ້", parent: "LOANS", icon: null, sort: 6 },
    { segment: "auto/loan_approval_history", title: "ປະຫວັດອະນຸມັດ", parent: "LOANS", icon: null, sort: 7 },
    { segment: "auto/loan_approval_limits", title: "ວົງເງິນອະນຸມັດ", parent: "LOANS", icon: null, sort: 8 },
    { segment: "auto/loan_ecl_staging", title: "ECL Staging", parent: "LOANS", icon: null, sort: 9 },
    { segment: "auto/borrowers_individual", title: "ຜູ້ກູ້ບຸກຄົນ", parent: "LOANS", icon: null, sort: 10 },
    { segment: "auto/borrowers_enterprise", title: "ຜູ້ກູ້ນິຕິບຸກຄົນ", parent: "LOANS", icon: null, sort: 11 },
    { segment: "auto/borrower_connections", title: "ການເຊື່ອມໂຍງຜູ້ກູ້", parent: "LOANS", icon: null, sort: 12 },

    // ── ③ ຫຼັກຊັບ ──
    { segment: "COLLATERALS", title: "ຫຼັກຊັບຄ້ຳປະກັນ", parent: null, icon: "BusinessIcon", sort: 50 },
    { segment: "auto/collaterals", title: "ຫຼັກຊັບ", parent: "COLLATERALS", icon: null, sort: 1 },
    { segment: "auto/collateral_individuals", title: "ຫຼັກຊັບບຸກຄົນ", parent: "COLLATERALS", icon: null, sort: 2 },
    { segment: "auto/collateral_enterprises", title: "ຫຼັກຊັບນິຕິບຸກຄົນ", parent: "COLLATERALS", icon: null, sort: 3 },

    // ── ④ ເງິນຝາກ ──
    { segment: "DEPOSITS", title: "ເງິນຝາກ (Deposits)", parent: null, icon: "BusinessIcon", sort: 60 },
    { segment: "auto/deposit_accounts", title: "ບັນຊີເງິນຝາກ", parent: "DEPOSITS", icon: null, sort: 1 },
    { segment: "auto/deposit_transactions", title: "ທຸລະກຳເງິນຝາກ", parent: "DEPOSITS", icon: null, sort: 2 },
    { segment: "auto/deposit_products", title: "ຜະລິດຕະພັນ", parent: "DEPOSITS", icon: null, sort: 3 },
    { segment: "auto/deposit_account_owners", title: "ເຈົ້າຂອງບັນຊີ", parent: "DEPOSITS", icon: null, sort: 4 },
    { segment: "13.deposits_new", title: "ເງິນຝາກ (BOL)", parent: "DEPOSITS", icon: null, sort: 5 },
    { segment: "14.depositors_individual_new", title: "ຜູ້ຝາກບຸກຄົນ", parent: "DEPOSITS", icon: null, sort: 6 },
    { segment: "15.depositors_enterprise_new", title: "ຜູ້ຝາກນິຕິບຸກຄົນ", parent: "DEPOSITS", icon: null, sort: 7 },

    // ── ⑤ ຮຸ້ນສະມາຊິກ ──
    { segment: "MEMBER_SHARES", title: "ຮຸ້ນສະມາຊິກ", parent: null, icon: "HandshakeIcon", sort: 70 },
    { segment: "auto/member_shares", title: "ຮຸ້ນ", parent: "MEMBER_SHARES", icon: null, sort: 1 },
    { segment: "auto/member_shares_individuals", title: "ຮຸ້ນບຸກຄົນ", parent: "MEMBER_SHARES", icon: null, sort: 2 },
    { segment: "auto/member_shares_enterprises", title: "ຮຸ້ນນິຕິບຸກຄົນ", parent: "MEMBER_SHARES", icon: null, sort: 3 },

    // ── ⑥ ບັນຊີ ──
    { segment: "ACCOUNTING", title: "ບັນຊີ (Accounting)", parent: null, icon: "BusinessIcon", sort: 80 },
    { segment: "auto/chart_of_accounts", title: "ຜັງບັນຊີ", parent: "ACCOUNTING", icon: null, sort: 1 },
    { segment: "auto/journal_entries", title: "ບັນທຶກປະຈຳວັນ", parent: "ACCOUNTING", icon: null, sort: 2 },
    { segment: "auto/journal_entry_lines", title: "ລາຍການບັນທຶກ", parent: "ACCOUNTING", icon: null, sort: 3 },
    { segment: "auto/trial_balance", title: "ໃບດຸ່ນດ່ຽງ", parent: "ACCOUNTING", icon: null, sort: 4 },
    { segment: "auto/account_categories", title: "ໝວດບັນຊີ", parent: "ACCOUNTING", icon: null, sort: 5 },
    { segment: "auto/gl_balances", title: "ຍອດ GL", parent: "ACCOUNTING", icon: null, sort: 6 },
    { segment: "auto/fiscal_periods", title: "ງວດບັນຊີ", parent: "ACCOUNTING", icon: null, sort: 7 },
    { segment: "auto/financial_statements", title: "ງົບການເງິນ", parent: "ACCOUNTING", icon: null, sort: 8 },
    { segment: "auto/financial_statement_lines", title: "ລາຍການງົບ", parent: "ACCOUNTING", icon: null, sort: 9 },
    { segment: "auto/exchange_rates", title: "ອັດຕາແລກປ່ຽນ", parent: "ACCOUNTING", icon: null, sort: 10 },
    { segment: "auto/ecl_parameters", title: "ECL Parameters", parent: "ACCOUNTING", icon: null, sort: 11 },
    { segment: "auto/period_close_log", title: "Log ປິດງວດ", parent: "ACCOUNTING", icon: null, sort: 12 },

    // ── ⑦ ວິສາຫະກິດ ──
    { segment: "ENTERPRISE", title: "ວິສາຫະກິດ & ອົງກອນ", parent: null, icon: "AccountTreeIcon", sort: 90 },
    { segment: "auto/enterprise_info", title: "ຂໍ້ມູນວິສາຫະກິດ", parent: "ENTERPRISE", icon: null, sort: 1 },
    { segment: "auto/enterprise_stakeholders", title: "ຜູ້ຖືຫຸ້ນ", parent: "ENTERPRISE", icon: null, sort: 2 },
    { segment: "auto/organizations", title: "ອົງກອນ", parent: "ENTERPRISE", icon: null, sort: 3 },
    { segment: "auto/org_branches", title: "ສາຂາ", parent: "ENTERPRISE", icon: null, sort: 4 },
    { segment: "auto/mfi_info", title: "ຂໍ້ມູນ MFI", parent: "ENTERPRISE", icon: null, sort: 5 },
    { segment: "auto/mfi_branches_info", title: "ສາຂາ MFI", parent: "ENTERPRISE", icon: null, sort: 6 },
    { segment: "auto/mfi_service_units_info", title: "ໜ່ວຍບໍລິການ", parent: "ENTERPRISE", icon: null, sort: 7 },
    { segment: "auto/mfi_hq_service_units", title: "ໜ່ວຍ HQ", parent: "ENTERPRISE", icon: null, sort: 8 },
    { segment: "auto/mfi_branch_service_units", title: "ໜ່ວຍສາຂາ", parent: "ENTERPRISE", icon: null, sort: 9 },
    { segment: "auto/departments", title: "ພະແນກ", parent: "ENTERPRISE", icon: null, sort: 10 },

    // ── ⑧ HR ──
    { segment: "HR", title: "ບຸກຄະລາກອນ (HR)", parent: null, icon: "BadgeIcon", sort: 100 },
    { segment: "auto/employees", title: "ພະນັກງານ", parent: "HR", icon: null, sort: 1 },
    { segment: "auto/employee_positions", title: "ຕຳແໜ່ງ", parent: "HR", icon: null, sort: 2 },
    { segment: "auto/employee_assignments", title: "ມອບໝາຍ", parent: "HR", icon: null, sort: 3 },
    { segment: "auto/employee_branch_assignments", title: "ປະຈຳສາຂາ", parent: "HR", icon: null, sort: 4 },
    { segment: "auto/employment_contracts", title: "ສັນຍາຈ້າງ", parent: "HR", icon: null, sort: 5 },
    { segment: "auto/payrolls", title: "ບັນຊີເງິນເດືອນ", parent: "HR", icon: null, sort: 6 },
    { segment: "auto/trainings", title: "ການຝຶກອົບຮົມ", parent: "HR", icon: null, sort: 7 },
    { segment: "auto/staff_compliance", title: "ການປະຕິບັດ", parent: "HR", icon: null, sort: 8 },

    // ── ⑨ ລະບົບ & ສິດ ──
    { segment: "SYSTEM", title: "ລະບົບ & ສິດ", parent: null, icon: "AccountCircleIcon", sort: 110 },
    { segment: "auto/users", title: "ຜູ້ໃຊ້", parent: "SYSTEM", icon: null, sort: 1 },
    { segment: "auto/roles", title: "ບົດບາດ", parent: "SYSTEM", icon: null, sort: 2 },
    { segment: "auto/permissions", title: "ສິດ", parent: "SYSTEM", icon: null, sort: 3 },
    { segment: "auto/role_permissions", title: "ສິດບົດບາດ", parent: "SYSTEM", icon: null, sort: 4 },
    { segment: "auto/role_menus", title: "Menu ບົດບາດ", parent: "SYSTEM", icon: null, sort: 5 },
    { segment: "auto/user_roles", title: "ບົດບາດຜູ້ໃຊ້", parent: "SYSTEM", icon: null, sort: 6 },
    { segment: "auto/menu_items", title: "ລາຍການ Menu", parent: "SYSTEM", icon: null, sort: 7 },
    { segment: "auto/audit_logs", title: "Audit Log", parent: "SYSTEM", icon: null, sort: 8 },
    { segment: "auto/notifications", title: "ແຈ້ງເຕືອນ", parent: "SYSTEM", icon: null, sort: 9 },

    // ── ⑩ Dict ທົ່ວໄປ ──
    { segment: "DICT_GENERAL", title: "Dict: ທົ່ວໄປ", parent: null, icon: "FolderIcon", sort: 120 },
    { segment: "auto/genders", title: "ເພດ", parent: "DICT_GENERAL", icon: null, sort: 1 },
    { segment: "auto/careers", title: "ອາຊີບ", parent: "DICT_GENERAL", icon: null, sort: 2 },
    { segment: "auto/marital_statuses", title: "ສະຖານະ", parent: "DICT_GENERAL", icon: null, sort: 3 },
    { segment: "auto/nationality", title: "ສັນຊາດ", parent: "DICT_GENERAL", icon: null, sort: 4 },
    { segment: "auto/educations", title: "ການສຶກສາ", parent: "DICT_GENERAL", icon: null, sort: 5 },
    { segment: "auto/countries", title: "ປະເທດ", parent: "DICT_GENERAL", icon: null, sort: 6 },
    { segment: "auto/provinces", title: "ແຂວງ", parent: "DICT_GENERAL", icon: null, sort: 7 },
    { segment: "auto/districts", title: "ເມືອງ", parent: "DICT_GENERAL", icon: null, sort: 8 },
    { segment: "auto/villages", title: "ບ້ານ", parent: "DICT_GENERAL", icon: null, sort: 9 },
    { segment: "auto/currencies", title: "ສະກຸນເງິນ", parent: "DICT_GENERAL", icon: null, sort: 10 },
    { segment: "auto/categories", title: "ໝວດໝູ່", parent: "DICT_GENERAL", icon: null, sort: 11 },

    // ── ⑪ Dict ເງິນກູ້ ──
    { segment: "DICT_LOAN", title: "Dict: ເງິນກູ້/ຝາກ", parent: null, icon: "FolderIcon", sort: 130 },
    { segment: "auto/loan_categories", title: "ໝວດເງິນກູ້", parent: "DICT_LOAN", icon: null, sort: 1 },
    { segment: "auto/loan_classifications", title: "ຈັດຊັ້ນ", parent: "DICT_LOAN", icon: null, sort: 2 },
    { segment: "auto/loan_funding_sources", title: "ແຫຼ່ງທຶນ", parent: "DICT_LOAN", icon: null, sort: 3 },
    { segment: "auto/loan_types", title: "ປະເພດເງິນກູ້", parent: "DICT_LOAN", icon: null, sort: 4 },
    { segment: "auto/loan_terms", title: "ເງື່ອນໄຂ", parent: "DICT_LOAN", icon: null, sort: 5 },
    { segment: "auto/loan_purpose", title: "ຈຸດປະສົງ", parent: "DICT_LOAN", icon: null, sort: 6 },
    { segment: "auto/deposit_types", title: "ປະເພດເງິນຝາກ", parent: "DICT_LOAN", icon: null, sort: 7 },
    { segment: "auto/collateral_categories", title: "ໝວດຫຼັກຊັບ", parent: "DICT_LOAN", icon: null, sort: 8 },
    { segment: "auto/customer_types", title: "ປະເພດລູກຄ້າ", parent: "DICT_LOAN", icon: null, sort: 9 },
    { segment: "auto/customer_blacklists", title: "ບັນຊີດຳ", parent: "DICT_LOAN", icon: null, sort: 10 },
    { segment: "auto/interest_configs", title: "ຕັ້ງດອກເບ້ຍ", parent: "DICT_LOAN", icon: null, sort: 11 },
    { segment: "auto/land_size_units", title: "ໜ່ວຍທີ່ດິນ", parent: "DICT_LOAN", icon: null, sort: 12 },
    { segment: "auto/key_personnels", title: "ບຸກຄົນສຳຄັນ", parent: "DICT_LOAN", icon: null, sort: 13 },

    // ── ⑫ Dict ວິສາຫະກິດ ──
    { segment: "DICT_ENTERPRISE", title: "Dict: ວິສາຫະກິດ", parent: null, icon: "FolderIcon", sort: 140 },
    { segment: "auto/enterprise_types", title: "ປະເພດ", parent: "DICT_ENTERPRISE", icon: null, sort: 1 },
    { segment: "auto/enterprise_categories", title: "ໝວດ", parent: "DICT_ENTERPRISE", icon: null, sort: 2 },
    { segment: "auto/enterprise_sizes", title: "ຂະໜາດ", parent: "DICT_ENTERPRISE", icon: null, sort: 3 },
    { segment: "auto/enterprise_models", title: "ແບບຈຳລອງ", parent: "DICT_ENTERPRISE", icon: null, sort: 4 },
    { segment: "auto/enterprise_model_details", title: "ລາຍລະອຽດ", parent: "DICT_ENTERPRISE", icon: null, sort: 5 },
    { segment: "auto/enterprise_stakeholder_roles", title: "ບົດບາດ", parent: "DICT_ENTERPRISE", icon: null, sort: 6 },
    { segment: "auto/economic_branches", title: "ສາຂາເສດຖະກິດ", parent: "DICT_ENTERPRISE", icon: null, sort: 7 },
    { segment: "auto/economic_sectors", title: "ພາກສ່ວນ", parent: "DICT_ENTERPRISE", icon: null, sort: 8 },
    { segment: "auto/bank_code", title: "ລະຫັດທະນາຄານ", parent: "DICT_ENTERPRISE", icon: null, sort: 9 },
    { segment: "auto/bank_type", title: "ປະເພດທະນາຄານ", parent: "DICT_ENTERPRISE", icon: null, sort: 10 },

    // ── ⑬ IIF ──
    { segment: "IIF", title: "ຂໍ້ມູນ IIF", parent: null, icon: "FolderIcon", sort: 150 },
    { segment: "auto/iif_headers", title: "IIF Headers", parent: "IIF", icon: null, sort: 1 },
    { segment: "auto/iif_individual_details", title: "ບຸກຄົນ", parent: "IIF", icon: null, sort: 2 },
    { segment: "auto/iif_enterprise_details", title: "ນິຕິບຸກຄົນ", parent: "IIF", icon: null, sort: 3 },
    { segment: "auto/iif_loan_details", title: "ສິນເຊື່ອ", parent: "IIF", icon: null, sort: 4 },
    { segment: "auto/iif_collateral_details", title: "ຫຼັກຊັບ", parent: "IIF", icon: null, sort: 5 },
    { segment: "auto/iif_cosigners", title: "ຜູ້ຄ້ຳປະກັນ", parent: "IIF", icon: null, sort: 6 },
    { segment: "auto/report_info", title: "ລາຍງານ", parent: "IIF", icon: null, sort: 7 },

    // ── ⑭ JDB ──
    { segment: "JDB", title: "JDB Payment", parent: null, icon: "PaidIcon", sort: 160 },
    { segment: "auto/jdb_transactions", title: "ທຸລະກຳ JDB", parent: "JDB", icon: null, sort: 1 },
    { segment: "auto/jdb_http_logs", title: "HTTP Logs", parent: "JDB", icon: null, sort: 2 },

    // ── ⑮ ອື່ນໆ ──
    { segment: "OTHER", title: "ອື່ນໆ", parent: null, icon: "FolderIcon", sort: 170 },
    { segment: "auto/individual_groups", title: "ກຸ່ມບຸກຄົນ", parent: "OTHER", icon: null, sort: 1 },
    { segment: "auto/v_borrower_loans", title: "ມຸມມອງຜູ້ກູ້", parent: "OTHER", icon: null, sort: 2 },
];

// ─── Default Roles ───
const DEFAULT_ROLES = [
    { code: 'SUPER_ADMIN', name: 'ຜູ້ບໍລິຫານລະບົບ', description: 'ເຂົ້າເຖິງທຸກເມນູ', is_system: true },
    { code: 'BRANCH_MANAGER', name: 'ຜູ້ຈັດການສາຂາ', description: 'ຈັດການສາຂາ ອະນຸມັດ ລາຍງານ', is_system: true },
    { code: 'LOAN_OFFICER', name: 'ພະນັກງານສິນເຊື່ອ', description: 'ປ່ອຍກູ້ ເກັບເງິນ', is_system: true },
    { code: 'TELLER', name: 'ພະນັກງານເຄົາເຕີ້', description: 'ຮັບຝາກ ຖອນ ຊຳລະ', is_system: true },
    { code: 'ACCOUNTANT', name: 'ພະນັກງານບັນຊີ', description: 'ບັນທຶກ JE ລາຍງານ BOL', is_system: true },
    { code: 'HR_MANAGER', name: 'ຜູ້ຈັດການ HR', description: 'ຈັດການ ພະນັກງານ ເງິນເດືອນ', is_system: true },
    { code: 'VIEWER', name: 'ຜູ້ເບິ່ງ', description: 'ເບິ່ງຂໍ້ມູນເທົ່ານັ້ນ', is_system: true },
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ ເຊື່ອມ DB ສຳເລັດ');

        const now = new Date();

        // 1. Seed menu_items (UPSERT by segment)
        console.log(`\n📋 Seeding ${MENU_TREE.length} menu items...`);
        for (const item of MENU_TREE) {
            await sequelize.query(`
                INSERT INTO menu_items (segment, title, parent_segment, icon, sort_order, is_active, created_at, updated_at)
                VALUES (:segment, :title, :parent, :icon, :sort, true, :now, :now)
                ON CONFLICT (segment) DO UPDATE SET
                    title = EXCLUDED.title,
                    parent_segment = EXCLUDED.parent_segment,
                    icon = EXCLUDED.icon,
                    sort_order = EXCLUDED.sort_order,
                    updated_at = EXCLUDED.updated_at
            `, {
                replacements: {
                    segment: item.segment,
                    title: item.title,
                    parent: item.parent,
                    icon: item.icon,
                    sort: item.sort,
                    now,
                },
                type: Sequelize.QueryTypes.INSERT,
            });
        }
        console.log(`   ✅ ${MENU_TREE.length} menu items seeded`);

        // 2. Seed roles (UPSERT by code)
        console.log(`\n👥 Seeding ${DEFAULT_ROLES.length} roles...`);
        for (const role of DEFAULT_ROLES) {
            await sequelize.query(`
                INSERT INTO roles (code, name, description, is_system, created_at, updated_at)
                VALUES (:code, :name, :desc, :is_system, :now, :now)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    updated_at = EXCLUDED.updated_at
            `, {
                replacements: { ...role, desc: role.description, now },
                type: Sequelize.QueryTypes.INSERT,
            });
        }
        console.log(`   ✅ ${DEFAULT_ROLES.length} roles seeded`);

        // 3. SUPER_ADMIN gets ALL menus
        console.log(`\n🔐 Assigning all menus to SUPER_ADMIN...`);
        const [superRole] = await sequelize.query(
            `SELECT id FROM roles WHERE code = 'SUPER_ADMIN' LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        if (superRole) {
            const allMenus = await sequelize.query(
                `SELECT id FROM menu_items`,
                { type: Sequelize.QueryTypes.SELECT }
            );
            for (const menu of allMenus) {
                await sequelize.query(`
                    INSERT INTO role_menus (role_id, menu_item_id, is_visible, created_at, updated_at)
                    VALUES (:roleId, :menuId, true, :now, :now)
                    ON CONFLICT DO NOTHING
                `, {
                    replacements: { roleId: superRole.id, menuId: menu.id, now },
                    type: Sequelize.QueryTypes.INSERT,
                });
            }
            console.log(`   ✅ ${allMenus.length} menus assigned to SUPER_ADMIN`);
        }

        console.log('\n✅✅✅ Seed ສຳເລັດ!\n');
    } catch (err) {
        console.error('❌ Seed ຜິດພາດ:', err.message);
    } finally {
        await sequelize.close();
    }
}

seed();
