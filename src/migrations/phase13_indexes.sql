-- ═══════════════════════════════════════════════════════════════
-- Phase 13: Database Indexes + Partition Strategy
-- Core Banking Performance Optimization
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. FK Indexes (ບັງຄັບ — ທຸກ FK column ຕ້ອງມີ index) ═══

-- Customer Domain
CREATE INDEX IF NOT EXISTS idx_personal_info_created ON personal_info(created_at);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_personal ON kyc_documents(personal_info_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_personal ON kyc_verifications(personal_info_id);

-- Loan Domain
CREATE INDEX IF NOT EXISTS idx_loan_contracts_borrower ON loan_contracts(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_product ON loan_contracts(loan_product_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_status ON loan_contracts(status);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_due ON loan_contracts(next_due_date);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_created ON loan_contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_contract ON loan_repayment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_due ON loan_repayment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_status ON loan_repayment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_borrower ON loan_applications(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_collaterals_contract ON loan_collaterals(contract_id);

-- Deposit Domain  
CREATE INDEX IF NOT EXISTS idx_deposit_accounts_customer ON deposit_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_deposit_accounts_product ON deposit_accounts(deposit_product_id);
CREATE INDEX IF NOT EXISTS idx_deposit_accounts_status ON deposit_accounts(status);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_account ON deposit_transactions(deposit_account_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_date ON deposit_transactions(transaction_date);

-- Transaction Domain
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);

-- Accounting Domain
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_balances_account ON gl_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_balances_period ON gl_balances(period);

-- Security Domain
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_employee ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Employee / HR Domain
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_personal ON employees(personal_info_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);

-- Audit Domain
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ═══ 2. Composite Indexes (ສຳລັບ common queries) ═══
CREATE INDEX IF NOT EXISTS idx_loan_contracts_borrower_status ON loan_contracts(borrower_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_contract_due ON loan_repayment_schedules(contract_id, due_date);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_account_date ON deposit_transactions(deposit_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date_status ON journal_entries(entry_date, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_created ON audit_logs(table_name, created_at);

-- ═══ 3. Partial Indexes (ລຸດ write cost — index only active records) ═══
CREATE INDEX IF NOT EXISTS idx_loan_contracts_active ON loan_contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active_only ON users(is_active) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_deposit_accounts_active ON deposit_accounts(status) WHERE deleted_at IS NULL;

-- ═══ 4. Partition Strategy (tables > 1M rows) ═══
-- NOTE: Partitioning requires table recreation. This is a PLAN, not auto-executable.
-- Execute manually in a maintenance window.

-- transactions → Range by Year
-- audit_logs → Range by Month  
-- loan_repayment_schedules → Range by Year
-- sms_logs → Range by Month
-- journal_entries → Range by Year

-- Example partition for audit_logs (execute manually):
-- CREATE TABLE audit_logs_2026 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- ═══ 5. Analyze statistics for query optimizer ═══
ANALYZE personal_info;
ANALYZE loan_contracts;
ANALYZE loan_repayment_schedules;
ANALYZE deposit_accounts;
ANALYZE deposit_transactions;
ANALYZE transactions;
ANALYZE journal_entries;
ANALYZE audit_logs;
ANALYZE users;
ANALYZE employees;
