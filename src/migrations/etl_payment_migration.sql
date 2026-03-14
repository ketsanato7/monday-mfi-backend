-- ═══════════════════════════════════════════════════════════
-- ETL Payment API — Migration Script
-- Tables: payment_provider_configs + etl_transactions
-- ═══════════════════════════════════════════════════════════

-- ════════════════════════════════════════
-- 1. payment_provider_configs
-- ຕາຕະລາງ config ສຳລັບ ETL, JDB, LMPS credentials
-- ຜູ້ໃຊ້ສາມາດ ປ້ອນ/ແກ້ໄຂ ໄດ້ຈາກ Web Admin
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_provider_configs (
    id           SERIAL PRIMARY KEY,
    tenant_id    INTEGER,
    provider     VARCHAR(30) NOT NULL,          -- 'ETL', 'JDB', 'LMPS'
    config_key   VARCHAR(50) NOT NULL,          -- 'user_id', 'sign_key', 'api_url'
    config_value TEXT NOT NULL,                 -- actual value
    is_active    BOOLEAN DEFAULT true,
    is_secret    BOOLEAN DEFAULT false,         -- ⚠️ mask ໃນ UI
    description  TEXT,                          -- ຄຳອະທິບາຍສຳລັບ UI
    status       VARCHAR(20) DEFAULT 'active',
    created_by   INTEGER,
    updated_by   INTEGER,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP
);

-- Unique: provider + config_key per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_config_unique
    ON payment_provider_configs (provider, config_key, COALESCE(tenant_id, 0))
    WHERE deleted_at IS NULL;

-- ════════════════════════════════════════
-- 2. Insert default ETL config rows
-- ════════════════════════════════════════
INSERT INTO payment_provider_configs (provider, config_key, config_value, is_secret, description)
VALUES 
    ('ETL', 'user_id',  '', false, 'ETL User ID (ໄດ້ຮັບຈາກ ETL Telecom)'),
    ('ETL', 'sign_key', '', true,  'ETL Secret Sign Key (ສຳລັບ SHA512 — ຫ້າມເຜີຍແຜ່)'),
    ('ETL', 'api_url',  'https://manage.etllao.com:8889/services/ETLPaymentTopup', false, 'ETL SOAP API Endpoint URL')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 3. etl_transactions — ບັນທຶກທຸກ ETL API calls
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS etl_transactions (
    id                  SERIAL PRIMARY KEY,
    tenant_id           INTEGER,
    transaction_id      VARCHAR(18) NOT NULL,
    function_name       VARCHAR(50) NOT NULL,
    msisdn              VARCHAR(15),
    internet_id         VARCHAR(20),
    pstn_number         VARCHAR(15),
    amount              DECIMAL(15,2) DEFAULT 0,
    result_code         VARCHAR(20),
    result_description  TEXT,
    request_xml         TEXT,
    response_xml        TEXT,
    status              VARCHAR(20) DEFAULT 'pending',
    retry_count         INTEGER DEFAULT 0,
    created_by          INTEGER,
    updated_by          INTEGER,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_etl_txn_id      ON etl_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_etl_msisdn      ON etl_transactions(msisdn);
CREATE INDEX IF NOT EXISTS idx_etl_inet_id     ON etl_transactions(internet_id);
CREATE INDEX IF NOT EXISTS idx_etl_status      ON etl_transactions(status);
CREATE INDEX IF NOT EXISTS idx_etl_created     ON etl_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_etl_func        ON etl_transactions(function_name);

-- ════════════════════════════════════════
-- 4. Verification
-- ════════════════════════════════════════
SELECT 'payment_provider_configs' AS tbl, COUNT(*) AS rows FROM payment_provider_configs
UNION ALL
SELECT 'etl_transactions', COUNT(*) FROM etl_transactions;
