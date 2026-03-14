-- Migration: BOL, LCIC & Holiday Compliance
-- Date: 2026-03-13

-- 1. Create Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    name_la VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    is_recurring BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 2. Create LCIC Reports Table
CREATE TABLE IF NOT EXISTS lcic_reports (
    id BIGSERIAL PRIMARY KEY,
    report_no VARCHAR(50) NOT NULL UNIQUE,
    report_date DATE NOT NULL,
    export_type VARCHAR(20) DEFAULT 'LICL',
    status VARCHAR(20) DEFAULT 'COMPLETED',
    file_path VARCHAR(500),
    total_records INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 3. Add bol_code to existing tables
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chart_of_accounts' AND column_name='bol_code') THEN
        ALTER TABLE chart_of_accounts ADD COLUMN bol_code VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='economic_branches' AND column_name='bol_code') THEN
        ALTER TABLE economic_branches ADD COLUMN bol_code VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='economic_sectors' AND column_name='bol_code') THEN
        ALTER TABLE economic_sectors ADD COLUMN bol_code VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loan_purpose' AND column_name='bol_code') THEN
        ALTER TABLE loan_purpose ADD COLUMN bol_code VARCHAR(50);
    END IF;
END $$;

-- 4. Seed Holidays (Lao National Holidays 2024-2025)
INSERT INTO holidays (holiday_date, name_la, name_en, is_recurring) VALUES
('2024-01-01', 'ວັນຂຶ້ນປີໃໝ່ສາກົນ', 'New Year''s Day', TRUE),
('2024-01-20', 'ວັນສ້າງຕັ້ງກອງທັບປະຊາຊົນລາວ', 'Lao People''s Army Day', TRUE),
('2024-03-08', 'ວັນແມ່ຍິງສາກົນ', 'International Women''s Day', TRUE),
('2024-03-22', 'ວັນສ້າງຕັ້ງພັກປະຊາຊົນປະຕິວັດລາວ', 'Lao People''s Revolutionary Party Day', TRUE),
('2024-04-14', 'ວັນບຸນປີໃໝ່ລາວ', 'Lao New Year', FALSE),
('2024-04-15', 'ວັນບຸນປີໃໝ່ລາວ', 'Lao New Year', FALSE),
('2024-04-16', 'ວັນບຸນປີໃໝ່ລາວ', 'Lao New Year', FALSE),
('2024-05-01', 'ວັນກໍາມະກອນສາກົນ', 'International Labour Day', TRUE),
('2024-06-01', 'ວັນເດັກນ້ອຍສາກົນ', 'International Children''s Day', TRUE),
('2024-10-17', 'ວັນອອກພັນສາປະວໍລະນາ', 'End of Buddhist Lent', FALSE),
('2024-12-02', 'ວັນຊາດ ສປປ ລາວ', 'Lao National Day', TRUE),
('2025-01-01', 'ວັນຂຶ້ນປີໃໝ່ສາກົນ', 'New Year''s Day', TRUE),
('2025-12-02', 'ວັນຊາດ ສປປ ລາວ', 'Lao National Day', TRUE)
ON CONFLICT (holiday_date) DO NOTHING;

-- 5. Standardize Economic Branches (BOL Codes)
UPDATE economic_branches SET bol_code = '1' WHERE value LIKE '%ກະສິກຳ%';
UPDATE economic_branches SET bol_code = '2' WHERE value LIKE '%ອຸດສາຫະກຳ%';
UPDATE economic_branches SET bol_code = '3' WHERE value LIKE '%ບໍລິການ%';
UPDATE economic_branches SET bol_code = '4' WHERE value LIKE '%ການຄ້າ%';

-- 6. Standardize Loan Classifications (BOL F04-F09)
UPDATE loan_classifications SET code = 'A', value = 'ສິນເຊື່ອປົກກະຕິ (A)' WHERE id = 1 OR value LIKE '%ປົກກະຕິ%';
UPDATE loan_classifications SET code = 'B', value = 'ສິນເຊື່ອຄວນເອົາໃຈໃສ່ (B)' WHERE id = 2 OR value LIKE '%ຄວນເອົາໃຈໃສ່%';
UPDATE loan_classifications SET code = 'C', value = 'ສິນເຊື່ອຕ່ຳກວ່າມາດຕະຖານ (C)' WHERE id = 3 OR value LIKE '%ຕ່ຳກວ່າມາດຕະຖານ%';
UPDATE loan_classifications SET code = 'D', value = 'ສິນເຊື່ອທີ່ໜ້າສົງໃສ (D)' WHERE id = 4 OR value LIKE '%ສົງໃສ%';
UPDATE loan_classifications SET code = 'E', value = 'ສິນເຊື່ອທີ່ເປັນໜີ້ສູນ (E)' WHERE id = 5 OR value LIKE '%ສູນເສຍ%';

-- 7. Add BOL Codes to Loan Purpose
UPDATE loan_purpose SET bol_code = '101' WHERE value LIKE '%ກະສິກຳ%';
UPDATE loan_purpose SET bol_code = '201' WHERE value LIKE '%ທຸລະກິດ%';
UPDATE loan_purpose SET bol_code = '301' WHERE value LIKE '%ບໍລິການ%';
UPDATE loan_purpose SET bol_code = '401' WHERE value LIKE '%ກໍ່ສ້າງ%';
UPDATE loan_purpose SET bol_code = '501' WHERE value LIKE '%ຊື້ລົດ%';
UPDATE loan_purpose SET bol_code = '601' WHERE value LIKE '%ຊື້ເຮືອນ%';
