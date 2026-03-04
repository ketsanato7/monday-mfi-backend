-- ═══════════════════════════════════════════════════════════
-- Collection Management System — Migration Script
-- ═══════════════════════════════════════════════════════════

-- ─── 1. ALTER loan_contracts: ເພີ່ມ collection fields ───
ALTER TABLE loan_contracts
    ADD COLUMN IF NOT EXISTS collection_status VARCHAR(20) DEFAULT 'NORMAL',
    ADD COLUMN IF NOT EXISTS collection_officer_id INTEGER REFERENCES employees(id),
    ADD COLUMN IF NOT EXISTS last_contact_date DATE,
    ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;

COMMENT ON COLUMN loan_contracts.collection_status IS 'NORMAL / FOLLOW_UP / INTENSIVE / NPL / LEGAL';
COMMENT ON COLUMN loan_contracts.collection_officer_id IS 'ພະນັກງານ ຕິດຕາມ ໜີ້ (ຕ່າງ ຈາກ assigned_officer)';

-- ─── 2. collection_actions: ບັນ ທຶກ ທຸກ ການ ຕິດ ຕາມ ───
CREATE TABLE IF NOT EXISTS collection_actions (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES loan_contracts(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,   -- CALL, SMS, VISIT, LETTER, LEGAL, SYSTEM
    action_date TIMESTAMP DEFAULT NOW(),
    officer_id INTEGER REFERENCES employees(id),
    dpd_at_action INTEGER DEFAULT 0,
    contact_result VARCHAR(50),         -- CONTACTED, NO_ANSWER, WRONG_NUMBER, PROMISE, PAID
    notes TEXT,
    next_action_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_actions_contract ON collection_actions(contract_id);
CREATE INDEX IF NOT EXISTS idx_collection_actions_officer ON collection_actions(officer_id);
CREATE INDEX IF NOT EXISTS idx_collection_actions_date ON collection_actions(action_date);

-- ─── 3. promise_to_pay: ສັນ ຍາ ຈ່າຍ ───
CREATE TABLE IF NOT EXISTS promise_to_pay (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES loan_contracts(id) ON DELETE CASCADE,
    action_id INTEGER REFERENCES collection_actions(id),
    promised_date DATE NOT NULL,
    promised_amount NUMERIC(18,2) NOT NULL,
    actual_paid_amount NUMERIC(18,2) DEFAULT 0,
    actual_paid_date DATE,
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, KEPT, BROKEN, PARTIAL
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptp_contract ON promise_to_pay(contract_id);
CREATE INDEX IF NOT EXISTS idx_ptp_status ON promise_to_pay(status);

-- ─── 4. collection_case_assignments: ແບ່ງ Case ───
CREATE TABLE IF NOT EXISTS collection_case_assignments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES loan_contracts(id) ON DELETE CASCADE,
    officer_id INTEGER NOT NULL REFERENCES employees(id),
    assigned_date DATE DEFAULT CURRENT_DATE,
    dpd_bucket VARCHAR(20) NOT NULL,     -- 0-3, 4-15, 16-30, 31-90, 90+
    priority VARCHAR(10) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(20) DEFAULT 'ACTIVE',   -- ACTIVE, RESOLVED, ESCALATED, TRANSFERRED
    resolved_date DATE,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_contract ON collection_case_assignments(contract_id);
CREATE INDEX IF NOT EXISTS idx_case_officer ON collection_case_assignments(officer_id);
CREATE INDEX IF NOT EXISTS idx_case_bucket ON collection_case_assignments(dpd_bucket);
CREATE INDEX IF NOT EXISTS idx_case_status ON collection_case_assignments(status);

-- ═══════════════════════════════════════════════════════════
-- ✅ Done! Run with: psql -d your_db -f collection_migration.sql
-- ═══════════════════════════════════════════════════════════
