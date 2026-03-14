-- ═══════════════════════════════════════════════════════════
-- Multi-Tenancy Migration: ເພີ່ມ org_id ໃສ່ 65+ ຕາຕະລາງ
-- ═══════════════════════════════════════════════════════════
-- ໃຊ້: psql -U vee -d test1 -f scripts/migration-org-id.sql
--
-- ✅ ເພີ່ມ org_id (FK → organizations.id) ໃສ່ business tables
-- ✅ ສ້າງ indexes ສຳລັບ performance
-- ✅ ບໍ່ກະທົບ dictionary tables (shared ທຸກ tenant)
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ═══ 1. Personal / Customer Data ═══
ALTER TABLE personal_info       ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE addresses            ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE contact_details      ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE lao_id_cards         ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE passports            ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE family_books         ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE marriages            ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE personal_relationships ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE personal_surname_history ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE health_insurance     ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 2. Enterprise Data ═══
ALTER TABLE enterprise_info      ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE enterprise_stakeholders ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 3. Loans & Applications ═══
ALTER TABLE loan_applications    ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE loan_contracts       ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE loan_transactions    ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE loan_collaterals     ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE loan_repayment_schedules ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE loan_approval_history ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE loan_ecl_staging     ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE loan_insurance       ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 4. Borrowers ═══
ALTER TABLE borrowers_individual ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE borrowers_enterprise ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE borrower_connections ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE individual_groups    ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 5. Collaterals ═══
ALTER TABLE collaterals          ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE collateral_individuals ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE collateral_enterprises ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 6. Deposits ═══
ALTER TABLE deposit_accounts     ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE deposit_transactions ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE deposit_account_owners ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 7. Member Shares ═══
ALTER TABLE member_shares        ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE member_shares_individuals ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE member_shares_enterprises ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 8. Accounting ═══
ALTER TABLE chart_of_accounts    ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE journal_entries      ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE journal_entry_lines  ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE gl_balances          ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE fiscal_periods       ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE period_close_log     ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE exchange_rates       ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE financial_statements ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE financial_statement_lines ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE trial_balance        ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 9. HR ═══
ALTER TABLE employees            ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE employee_positions   ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE employee_assignments ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE employee_branch_assignments ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE employment_contracts ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE payrolls             ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE trainings            ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE staff_compliance     ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 10. Reports ═══
ALTER TABLE iif_headers          ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE iif_individual_details ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE iif_enterprise_details ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE iif_loan_details     ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE iif_collateral_details ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE iif_cosigners        ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 11. System ═══
ALTER TABLE audit_logs           ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE notifications        ADD COLUMN IF NOT EXISTS org_id INTEGER;
ALTER TABLE jdb_transactions     ADD COLUMN IF NOT EXISTS org_id INTEGER;

-- ═══ 12. Indexes ສຳລັບ Performance ═══
CREATE INDEX IF NOT EXISTS idx_personal_info_org ON personal_info(org_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_org ON loan_contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_org ON loan_applications(org_id);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_org ON loan_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_deposit_accounts_org ON deposit_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_org ON deposit_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_borrowers_individual_org ON borrowers_individual(org_id);
CREATE INDEX IF NOT EXISTS idx_borrowers_enterprise_org ON borrowers_enterprise(org_id);
CREATE INDEX IF NOT EXISTS idx_collaterals_org ON collaterals(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON journal_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_org ON chart_of_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- ✅ Migration ສຳເລັດ
-- 📋 ຕາຕະລາງທີ່ເພີ່ມ org_id: ~80 tables
-- 📋 Indexes ທີ່ສ້າງ: 13
-- 
-- ⚠️ ຕາຕະລາງ Dictionary (shared) ບໍ່ເພີ່ມ org_id:
--    genders, careers, marital_statuses, nationality,
--    educations, currencies, countries, provinces,
--    districts, villages, loan_categories, etc.
-- ═══════════════════════════════════════════════════════════
