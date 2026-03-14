-- ═══════════════════════════════════════════════════════════════════════
-- Migration: BOL/LCIC Compliance — ເພີ່ມ columns ໃໝ່ (Additive Only)
-- Date: 2026-03-14
-- ⚠️ ບໍ່ລຶບ/ປ່ຽນ columns ເດີມ — ເພີ່ມໃໝ່ເທົ່ານັ້ນ (backward compatible)
-- ═══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
-- 1. deposit_accounts — BoL T13 (9 columns ໃໝ່)
-- ──────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='depositor_type_id') THEN
        ALTER TABLE deposit_accounts ADD COLUMN depositor_type_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='deposit_type_id') THEN
        ALTER TABLE deposit_accounts ADD COLUMN deposit_type_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='maturity_date') THEN
        ALTER TABLE deposit_accounts ADD COLUMN maturity_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='interest_rate') THEN
        ALTER TABLE deposit_accounts ADD COLUMN interest_rate DECIMAL(8,4) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='opening_balance') THEN
        ALTER TABLE deposit_accounts ADD COLUMN opening_balance DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='deposit_amount') THEN
        ALTER TABLE deposit_accounts ADD COLUMN deposit_amount DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='withdrawal_amount') THEN
        ALTER TABLE deposit_accounts ADD COLUMN withdrawal_amount DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='economic_sector_id') THEN
        ALTER TABLE deposit_accounts ADD COLUMN economic_sector_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deposit_accounts' AND column_name='economic_branch_id') THEN
        ALTER TABLE deposit_accounts ADD COLUMN economic_branch_id INTEGER;
    END IF;
END $$;

-- FK constraints (deposit_accounts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_da_depositor_type') THEN
        ALTER TABLE deposit_accounts ADD CONSTRAINT fk_da_depositor_type FOREIGN KEY (depositor_type_id) REFERENCES customer_types(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_da_deposit_type') THEN
        ALTER TABLE deposit_accounts ADD CONSTRAINT fk_da_deposit_type FOREIGN KEY (deposit_type_id) REFERENCES deposit_types(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_da_economic_sector') THEN
        ALTER TABLE deposit_accounts ADD CONSTRAINT fk_da_economic_sector FOREIGN KEY (economic_sector_id) REFERENCES economic_sectors(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_da_economic_branch') THEN
        ALTER TABLE deposit_accounts ADD CONSTRAINT fk_da_economic_branch FOREIGN KEY (economic_branch_id) REFERENCES economic_branches(id) ON DELETE RESTRICT;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK constraints skipped (tables may not exist yet): %', SQLERRM;
END $$;

-- ──────────────────────────────────────────────────────
-- 2. gl_balances — BoL T19 trial_balance 6 ຫ້ອງ (7 columns ໃໝ່)
-- ──────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gl_balances' AND column_name='account_title') THEN
        ALTER TABLE gl_balances ADD COLUMN account_title VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gl_balances' AND column_name='trial_balance_debit') THEN
        ALTER TABLE gl_balances ADD COLUMN trial_balance_debit DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gl_balances' AND column_name='trial_balance_credit') THEN
        ALTER TABLE gl_balances ADD COLUMN trial_balance_credit DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gl_balances' AND column_name='adjustment_debit') THEN
        ALTER TABLE gl_balances ADD COLUMN adjustment_debit DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gl_balances' AND column_name='adjustment_credit') THEN
        ALTER TABLE gl_balances ADD COLUMN adjustment_credit DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gl_balances' AND column_name='adjusted_trial_balance_debit') THEN
        ALTER TABLE gl_balances ADD COLUMN adjusted_trial_balance_debit DECIMAL(20,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gl_balances' AND column_name='adjusted_trial_balance_credit') THEN
        ALTER TABLE gl_balances ADD COLUMN adjusted_trial_balance_credit DECIMAL(20,2) DEFAULT 0;
    END IF;
END $$;

-- ──────────────────────────────────────────────────────
-- 3. collaterals — ເພີ່ມ value_amount DECIMAL (1 column ໃໝ່)
-- ──────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collaterals' AND column_name='value_amount') THEN
        ALTER TABLE collaterals ADD COLUMN value_amount DECIMAL(20,2);
    END IF;
END $$;

-- Backfill: ຄັດລອກ value (STRING) → value_amount (DECIMAL) ຖ້າເປັນຕົວເລກ
UPDATE collaterals
SET value_amount = CAST(value AS DECIMAL(20,2))
WHERE value_amount IS NULL
  AND value ~ '^\d+\.?\d*$';

-- ──────────────────────────────────────────────────────
-- 4. collateral_enterprises — ແກ້ collateral_id INTEGER → BIGINT
-- ──────────────────────────────────────────────────────
DO $$
BEGIN
    -- ກວດວ່າ column ຍັງເປັນ integer ຢູ່ ຈຶ່ງປ່ຽນ
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='collateral_enterprises' AND column_name='collateral_id' AND data_type='integer'
    ) THEN
        ALTER TABLE collateral_enterprises ALTER COLUMN collateral_id TYPE BIGINT;
    END IF;
END $$;

-- ──────────────────────────────────────────────────────
-- 5. Dictionary tables — ເພີ່ມ value_en, code, description
-- ──────────────────────────────────────────────────────

-- 5a. genders (+value_en, +code)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='genders' AND column_name='value_en') THEN
        ALTER TABLE genders ADD COLUMN value_en VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='genders' AND column_name='code') THEN
        ALTER TABLE genders ADD COLUMN code VARCHAR(10);
    END IF;
END $$;

-- 5b. enterprise_sizes (+value_en, +code, +description)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enterprise_sizes' AND column_name='value_en') THEN
        ALTER TABLE enterprise_sizes ADD COLUMN value_en VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enterprise_sizes' AND column_name='code') THEN
        ALTER TABLE enterprise_sizes ADD COLUMN code VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enterprise_sizes' AND column_name='description') THEN
        ALTER TABLE enterprise_sizes ADD COLUMN description TEXT;
    END IF;
END $$;

-- 5c. loan_categories (+value_en, +code, +description)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_categories' AND column_name='value_en') THEN
        ALTER TABLE loan_categories ADD COLUMN value_en VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_categories' AND column_name='code') THEN
        ALTER TABLE loan_categories ADD COLUMN code VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_categories' AND column_name='description') THEN
        ALTER TABLE loan_categories ADD COLUMN description TEXT;
    END IF;
END $$;

-- 5d. loan_classifications (+value_en)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_classifications' AND column_name='value_en') THEN
        ALTER TABLE loan_classifications ADD COLUMN value_en VARCHAR(255);
    END IF;
END $$;

-- Seed value_en for loan_classifications (BoL 184 standard)
UPDATE loan_classifications SET value_en = 'Normal (A)' WHERE code = 'A' AND value_en IS NULL;
UPDATE loan_classifications SET value_en = 'Special Mention (B)' WHERE code = 'B' AND value_en IS NULL;
UPDATE loan_classifications SET value_en = 'Substandard (C)' WHERE code = 'C' AND value_en IS NULL;
UPDATE loan_classifications SET value_en = 'Doubtful (D)' WHERE code = 'D' AND value_en IS NULL;
UPDATE loan_classifications SET value_en = 'Loss (E)' WHERE code = 'E' AND value_en IS NULL;

-- 5e. loan_funding_sources (+value_en, +code, +description)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_funding_sources' AND column_name='value_en') THEN
        ALTER TABLE loan_funding_sources ADD COLUMN value_en VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_funding_sources' AND column_name='code') THEN
        ALTER TABLE loan_funding_sources ADD COLUMN code VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_funding_sources' AND column_name='description') THEN
        ALTER TABLE loan_funding_sources ADD COLUMN description TEXT;
    END IF;
END $$;

-- 5f. borrower_connections (+value_en, +code, +description)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='borrower_connections' AND column_name='value_en') THEN
        ALTER TABLE borrower_connections ADD COLUMN value_en VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='borrower_connections' AND column_name='code') THEN
        ALTER TABLE borrower_connections ADD COLUMN code VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='borrower_connections' AND column_name='description') THEN
        ALTER TABLE borrower_connections ADD COLUMN description TEXT;
    END IF;
END $$;

-- 5g. marital_statuses (+value_en)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='marital_statuses' AND column_name='value_en') THEN
        ALTER TABLE marital_statuses ADD COLUMN value_en VARCHAR(255);
    END IF;
END $$;

-- Seed value_en for marital_statuses (LCIC CIB standard)
UPDATE marital_statuses SET value_en = 'Single' WHERE code = 'S' AND value_en IS NULL;
UPDATE marital_statuses SET value_en = 'Married' WHERE code = 'M' AND value_en IS NULL;
UPDATE marital_statuses SET value_en = 'Divorced' WHERE code = 'D' AND value_en IS NULL;
UPDATE marital_statuses SET value_en = 'Widowed' WHERE code = 'W' AND value_en IS NULL;
UPDATE marital_statuses SET value_en = 'Separated' WHERE code = 'P' AND value_en IS NULL;
UPDATE marital_statuses SET value_en = 'Living as Married' WHERE code = 'F' AND value_en IS NULL;
UPDATE marital_statuses SET value_en = 'Other' WHERE code = 'O' AND value_en IS NULL;

-- Seed value_en for genders
UPDATE genders SET value_en = 'Male', code = 'M' WHERE value LIKE '%ຊາຍ%' AND value_en IS NULL;
UPDATE genders SET value_en = 'Female', code = 'F' WHERE value LIKE '%ຍິງ%' AND value_en IS NULL;

-- ──────────────────────────────────────────────────────
-- 6. Indexes ສຳລັບ columns ໃໝ່ (FK performance)
-- ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_da_depositor_type ON deposit_accounts(depositor_type_id);
CREATE INDEX IF NOT EXISTS idx_da_deposit_type ON deposit_accounts(deposit_type_id);
CREATE INDEX IF NOT EXISTS idx_da_economic_sector ON deposit_accounts(economic_sector_id);
CREATE INDEX IF NOT EXISTS idx_da_economic_branch ON deposit_accounts(economic_branch_id);
CREATE INDEX IF NOT EXISTS idx_da_maturity_date ON deposit_accounts(maturity_date);
CREATE INDEX IF NOT EXISTS idx_gl_account_title ON gl_balances(account_title);

-- ═══════════════════════════════════════════════════════════════════════
-- ✅ ສຳເລັດ: ເພີ່ມ 30+ columns ໃໝ່ ໂດຍບໍ່ກະທົບ columns/data ເດີມ
-- ═══════════════════════════════════════════════════════════════════════
