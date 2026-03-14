-- ═══════════════════════════════════════════════════════════
-- Phase 7: CTR Reports Table (AML/CFT Article 20)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ctr_reports (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    -- Transaction Reference
    transaction_type VARCHAR(20),
    transaction_id INTEGER,
    transaction_date TIMESTAMP,
    -- Amount
    amount DECIMAL(20,4) NOT NULL,
    currency_id INTEGER,
    amount_lak DECIMAL(20,4),
    -- Customer
    customer_type VARCHAR(20),
    customer_id INTEGER,
    customer_name VARCHAR(255),
    customer_id_number VARCHAR(50),
    -- Report
    report_type VARCHAR(10) DEFAULT 'CTR',
    report_no VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    threshold_amount DECIMAL(20,4) DEFAULT 100000000,
    -- Submission
    submitted_at TIMESTAMP,
    submitted_by INTEGER,
    amlio_reference VARCHAR(100),
    notes TEXT,
    -- Branch/Officer
    branch_id VARCHAR(50),
    officer_id INTEGER,
    -- Audit
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ctr_status ON ctr_reports(status);
CREATE INDEX IF NOT EXISTS idx_ctr_report_no ON ctr_reports(report_no);
CREATE INDEX IF NOT EXISTS idx_ctr_customer ON ctr_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_ctr_transaction ON ctr_reports(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ctr_created_at ON ctr_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_ctr_tenant ON ctr_reports(tenant_id);

-- ═══════════════════════════════════════════════════════════
-- Phase 8: Approval Workflows Table (BoL Decree 184)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    entity_type VARCHAR(50) NOT NULL,    -- 'loan_disbursement', 'transfer', 'account_freeze'
    entity_id INTEGER NOT NULL,
    -- Workflow
    requested_by INTEGER,                -- FK → users
    approved_by INTEGER,                 -- FK → users
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    -- Details
    amount DECIMAL(20,4),
    notes TEXT,
    rejection_reason TEXT,
    -- Approval chain
    approval_level INTEGER DEFAULT 1,    -- 1=maker, 2=checker
    required_level INTEGER DEFAULT 2,    -- How many levels needed
    -- Audit
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approval_entity ON approval_workflows(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_requested_by ON approval_workflows(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_tenant ON approval_workflows(tenant_id);
