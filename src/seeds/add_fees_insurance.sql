-- =============================================
-- Migration: Add loan_fees & loan_insurance tables
-- =============================================

CREATE TABLE IF NOT EXISTS loan_fees (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT REFERENCES loan_contracts(id) ON DELETE SET NULL,
    fee_type VARCHAR(255) NOT NULL,
    fee_amount DECIMAL(20,2) NOT NULL DEFAULT 0,
    deducted_from_loan BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS loan_insurance (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT REFERENCES loan_contracts(id) ON DELETE SET NULL,
    insurance_type VARCHAR(255) NOT NULL,
    premium DECIMAL(20,2) NOT NULL DEFAULT 0,
    coverage_amount DECIMAL(20,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    beneficiary VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Index for fast lookup by loan
CREATE INDEX IF NOT EXISTS idx_loan_fees_loan_id ON loan_fees(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_insurance_loan_id ON loan_insurance(loan_id);
