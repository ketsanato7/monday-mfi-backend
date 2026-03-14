-- ═══════════════════════════════════════════════════════════
-- Phase 1+2+3: Combined Migration Script (v2 — Safe)
-- AML/CFT Compliance: timestamps + soft delete + audit fields
-- ═══════════════════════════════════════════════════════════
-- This migration dynamically queries existing tables to avoid errors.
-- ═══════════════════════════════════════════════════════════

-- Add columns to ALL existing public tables dynamically
DO $$ 
DECLARE
    tbl RECORD;
    col_count INTEGER := 0;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'v_%'
        ORDER BY tablename
    LOOP
        -- Phase 1: Add timestamps
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', tbl.tablename);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', tbl.tablename);
        
        -- Phase 2: Add soft delete
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP', tbl.tablename);
        
        -- Phase 3: Add audit fields
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by INTEGER', tbl.tablename);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by INTEGER', tbl.tablename);
        
        col_count := col_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Phase 1+2+3 migration complete for % tables', col_count;
END $$;

-- ════════════════════════════════════════
-- Backfill: Set created_at for existing records that have NULL
-- ════════════════════════════════════════
DO $$
DECLARE
    tbl RECORD;
    affected INTEGER;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'v_%'
    LOOP
        EXECUTE format('UPDATE %I SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL', tbl.tablename);
        GET DIAGNOSTICS affected = ROW_COUNT;
        IF affected > 0 THEN
            RAISE NOTICE '  Backfilled % rows in %', affected, tbl.tablename;
        END IF;
    END LOOP;
END $$;

-- ════════════════════════════════════════
-- Verification query
-- ════════════════════════════════════════
SELECT 
    'Tables with all 5 audit columns' AS check_name,
    COUNT(DISTINCT c.table_name) AS count
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND c.column_name = 'created_by'
AND EXISTS (SELECT 1 FROM information_schema.columns c2 
            WHERE c2.table_name = c.table_name 
            AND c2.column_name = 'deleted_at' 
            AND c2.table_schema = 'public');
