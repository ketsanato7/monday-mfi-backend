-- ═══════════════════════════════════════════════════
-- SEED PART 5: Accounting, Deposits, Fiscal Periods
-- ═══════════════════════════════════════════════════

-- ══════════════════════════
-- 5A. Account Categories
-- ══════════════════════════
INSERT INTO account_categories (code, name_lo, name_en, normal_balance, sort_order) VALUES
('ASSET', 'ຊັບ ສິນ', 'Assets', 'DEBIT', 1),
('LIABILITY', 'ໜີ້ ສິນ', 'Liabilities', 'CREDIT', 2),
('EQUITY', 'ທຶນ', 'Equity', 'CREDIT', 3),
('REVENUE', 'ລາຍ ຮັບ', 'Revenue', 'CREDIT', 4),
('EXPENSE', 'ລາຍ ຈ່າຍ', 'Expenses', 'DEBIT', 5)
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 5B. Chart of Accounts (ມາດ ຕະ ຖານ MFI ລາວ)
-- ══════════════════════════
INSERT INTO chart_of_accounts (id, code, name, category_id, parent_code, is_header, org_code) VALUES
-- ═══ ຊັບ ສິນ (1xxx) ═══
(1, '1000', 'ຊັບ ສິນ', (SELECT id FROM account_categories WHERE code='ASSET'), NULL, true, 'MFI001'),
(2, '1100', 'ເງິນ ສົດ ແລະ ເທົ່າ ທຽມ', (SELECT id FROM account_categories WHERE code='ASSET'), '1000', true, 'MFI001'),
(3, '1110', 'ເງິນ ສົດ ໃນ ມື', (SELECT id FROM account_categories WHERE code='ASSET'), '1100', false, 'MFI001'),
(4, '1120', 'ເງິນ ຝາກ ຢູ່ ທະ ນາ ຄານ', (SELECT id FROM account_categories WHERE code='ASSET'), '1100', false, 'MFI001'),
(5, '1200', 'ສິນ ເຊື່ອ ລູກ ຄ້າ', (SELECT id FROM account_categories WHERE code='ASSET'), '1000', true, 'MFI001'),
(6, '1210', 'ສິນ ເຊື່ອ ປົກ ກະ ຕິ', (SELECT id FROM account_categories WHERE code='ASSET'), '1200', false, 'MFI001'),
(7, '1220', 'ສິນ ເຊື່ອ ຄ້າງ ຊຳ ລະ', (SELECT id FROM account_categories WHERE code='ASSET'), '1200', false, 'MFI001'),
(8, '1230', 'ດອກ ເບ້ຍ ຄ້າງ ຮັບ', (SELECT id FROM account_categories WHERE code='ASSET'), '1200', false, 'MFI001'),
(9, '1290', 'ກັນ ສຳ ຮອງ ໜີ້ ສູນ', (SELECT id FROM account_categories WHERE code='ASSET'), '1200', false, 'MFI001'),
(10, '1300', 'ຊັບ ສິນ ຄົງ ທີ່', (SELECT id FROM account_categories WHERE code='ASSET'), '1000', true, 'MFI001'),
(11, '1310', 'ທີ່ ດິນ', (SELECT id FROM account_categories WHERE code='ASSET'), '1300', false, 'MFI001'),
(12, '1320', 'ອາ ຄານ', (SELECT id FROM account_categories WHERE code='ASSET'), '1300', false, 'MFI001'),
(13, '1330', 'ອຸ ປະ ກອນ ແລະ ເຄື່ອງ ໃຊ້', (SELECT id FROM account_categories WHERE code='ASSET'), '1300', false, 'MFI001'),
(14, '1340', 'ຫັກ ຄ່າ ເສື່ອມ', (SELECT id FROM account_categories WHERE code='ASSET'), '1300', false, 'MFI001'),
-- ═══ ໜີ້ ສິນ (2xxx) ═══
(15, '2000', 'ໜີ້ ສິນ', (SELECT id FROM account_categories WHERE code='LIABILITY'), NULL, true, 'MFI001'),
(16, '2100', 'ເງິນ ຝາກ ລູກ ຄ້າ', (SELECT id FROM account_categories WHERE code='LIABILITY'), '2000', true, 'MFI001'),
(17, '2110', 'ເງິນ ຝາກ ອອມ ຊັບ', (SELECT id FROM account_categories WHERE code='LIABILITY'), '2100', false, 'MFI001'),
(18, '2120', 'ເງິນ ຝາກ ປະ ຈຳ', (SELECT id FROM account_categories WHERE code='LIABILITY'), '2100', false, 'MFI001'),
(19, '2200', 'ໜີ້ ກູ້ ຢືມ', (SELECT id FROM account_categories WHERE code='LIABILITY'), '2000', true, 'MFI001'),
(20, '2210', 'ກູ້ ຢືມ BOL', (SELECT id FROM account_categories WHERE code='LIABILITY'), '2200', false, 'MFI001'),
(21, '2220', 'ກູ້ ຢືມ ຕ່າງ ປະ ເທດ', (SELECT id FROM account_categories WHERE code='LIABILITY'), '2200', false, 'MFI001'),
(22, '2300', 'ໜີ້ ສິນ ຄ້າງ ຈ່າຍ', (SELECT id FROM account_categories WHERE code='LIABILITY'), '2000', false, 'MFI001'),
-- ═══ ທຶນ (3xxx) ═══
(23, '3000', 'ທຶນ', (SELECT id FROM account_categories WHERE code='EQUITY'), NULL, true, 'MFI001'),
(24, '3100', 'ທຶນ ຈົດ ທະ ບຽນ', (SELECT id FROM account_categories WHERE code='EQUITY'), '3000', false, 'MFI001'),
(25, '3200', 'ທຶນ ສະ ສົມ', (SELECT id FROM account_categories WHERE code='EQUITY'), '3000', false, 'MFI001'),
(26, '3300', 'ກຳ ໄລ (ຂາດ ທຶນ) ສະ ສົມ', (SELECT id FROM account_categories WHERE code='EQUITY'), '3000', false, 'MFI001'),
-- ═══ ລາຍ ຮັບ (4xxx) ═══
(27, '4000', 'ລາຍ ຮັບ', (SELECT id FROM account_categories WHERE code='REVENUE'), NULL, true, 'MFI001'),
(28, '4100', 'ດອກ ເບ້ຍ ຮັບ ຈາກ ສິນ ເຊື່ອ', (SELECT id FROM account_categories WHERE code='REVENUE'), '4000', false, 'MFI001'),
(29, '4200', 'ຄ່າ ທຳ ນຽມ', (SELECT id FROM account_categories WHERE code='REVENUE'), '4000', false, 'MFI001'),
(30, '4300', 'ລາຍ ຮັບ ອື່ນ', (SELECT id FROM account_categories WHERE code='REVENUE'), '4000', false, 'MFI001'),
-- ═══ ລາຍ ຈ່າຍ (5xxx) ═══
(31, '5000', 'ລາຍ ຈ່າຍ', (SELECT id FROM account_categories WHERE code='EXPENSE'), NULL, true, 'MFI001'),
(32, '5100', 'ດອກ ເບ້ຍ ຈ່າຍ', (SELECT id FROM account_categories WHERE code='EXPENSE'), '5000', false, 'MFI001'),
(33, '5200', 'ເງິນ ເດືອນ ແລະ ສະ ຫວັດ ດີ ການ', (SELECT id FROM account_categories WHERE code='EXPENSE'), '5000', false, 'MFI001'),
(34, '5300', 'ຄ່າ ເຊົ່າ', (SELECT id FROM account_categories WHERE code='EXPENSE'), '5000', false, 'MFI001'),
(35, '5400', 'ຄ່າ ເສື່ອມ ລາ ຄາ', (SELECT id FROM account_categories WHERE code='EXPENSE'), '5000', false, 'MFI001'),
(36, '5500', 'ຄ່າ ບໍ ລິ ການ ທົ່ວ ໄປ', (SELECT id FROM account_categories WHERE code='EXPENSE'), '5000', false, 'MFI001'),
(37, '5600', 'ຄ່າ ກັນ ສຳ ຮອງ ໜີ້ ສູນ', (SELECT id FROM account_categories WHERE code='EXPENSE'), '5000', false, 'MFI001'),
(38, '5700', 'ລາຍ ຈ່າຍ ອື່ນ', (SELECT id FROM account_categories WHERE code='EXPENSE'), '5000', false, 'MFI001')
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 5C. Fiscal Periods
-- ══════════════════════════
INSERT INTO fiscal_periods (id, period_name, period_type, start_date, end_date, status, org_code) VALUES
(1, '2025-01', 'MONTHLY', '2025-01-01', '2025-01-31', 'CLOSED', 'MFI001'),
(2, '2025-02', 'MONTHLY', '2025-02-01', '2025-02-28', 'CLOSED', 'MFI001'),
(3, '2025-03', 'MONTHLY', '2025-03-01', '2025-03-31', 'CLOSED', 'MFI001'),
(4, '2025-04', 'MONTHLY', '2025-04-01', '2025-04-30', 'CLOSED', 'MFI001'),
(5, '2025-05', 'MONTHLY', '2025-05-01', '2025-05-31', 'CLOSED', 'MFI001'),
(6, '2025-06', 'MONTHLY', '2025-06-01', '2025-06-30', 'CLOSED', 'MFI001'),
(7, '2025-07', 'MONTHLY', '2025-07-01', '2025-07-31', 'CLOSED', 'MFI001'),
(8, '2025-08', 'MONTHLY', '2025-08-01', '2025-08-31', 'CLOSED', 'MFI001'),
(9, '2025-09', 'MONTHLY', '2025-09-01', '2025-09-30', 'CLOSED', 'MFI001'),
(10, '2025-10', 'MONTHLY', '2025-10-01', '2025-10-31', 'CLOSED', 'MFI001'),
(11, '2025-11', 'MONTHLY', '2025-11-01', '2025-11-30', 'CLOSED', 'MFI001'),
(12, '2025-12', 'MONTHLY', '2025-12-01', '2025-12-31', 'CLOSED', 'MFI001'),
(13, '2026-01', 'MONTHLY', '2026-01-01', '2026-01-31', 'CLOSED', 'MFI001'),
(14, '2026-02', 'MONTHLY', '2026-02-01', '2026-02-28', 'OPEN', 'MFI001')
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 5D. GL Balances (for BOL F10 — ງົບ ດຸນ)
-- ══════════════════════════
INSERT INTO gl_balances (account_code, fiscal_period_id, org_code, opening_debit, opening_credit, period_debit, period_credit, closing_debit, closing_credit) VALUES
-- ══ ເງິນ ສົດ
('1110', 14, 'MFI001', 450000000, 0, 80000000, 50000000, 480000000, 0),
('1120', 14, 'MFI001', 1200000000, 0, 200000000, 180000000, 1220000000, 0),
-- ══ ສິນ ເຊື່ອ
('1210', 14, 'MFI001', 850000000, 0, 150000000, 80000000, 920000000, 0),
('1220', 14, 'MFI001', 75000000, 0, 20000000, 5000000, 90000000, 0),
('1230', 14, 'MFI001', 35000000, 0, 12000000, 8000000, 39000000, 0),
('1290', 14, 'MFI001', 0, 45000000, 0, 8000000, 0, 53000000),
-- ══ ຊັບ ສິນ ຄົງ ທີ່
('1310', 14, 'MFI001', 200000000, 0, 0, 0, 200000000, 0),
('1320', 14, 'MFI001', 350000000, 0, 0, 0, 350000000, 0),
('1330', 14, 'MFI001', 80000000, 0, 5000000, 0, 85000000, 0),
('1340', 14, 'MFI001', 0, 65000000, 0, 3000000, 0, 68000000),
-- ══ ເງິນ ຝາກ
('2110', 14, 'MFI001', 0, 600000000, 0, 50000000, 0, 650000000),
('2120', 14, 'MFI001', 0, 400000000, 0, 30000000, 0, 430000000),
-- ══ ໜີ້ ກູ້ ຢືມ
('2210', 14, 'MFI001', 0, 500000000, 0, 0, 0, 500000000),
('2220', 14, 'MFI001', 0, 300000000, 30000000, 0, 0, 270000000),
('2300', 14, 'MFI001', 0, 25000000, 5000000, 8000000, 0, 28000000),
-- ══ ທຶນ
('3100', 14, 'MFI001', 0, 800000000, 0, 0, 0, 800000000),
('3200', 14, 'MFI001', 0, 150000000, 0, 0, 0, 150000000),
('3300', 14, 'MFI001', 0, 120000000, 0, 20000000, 0, 140000000),
-- ══ ລາຍ ຮັບ
('4100', 14, 'MFI001', 0, 0, 0, 45000000, 0, 45000000),
('4200', 14, 'MFI001', 0, 0, 0, 5000000, 0, 5000000),
('4300', 14, 'MFI001', 0, 0, 0, 2000000, 0, 2000000),
-- ══ ລາຍ ຈ່າຍ
('5100', 14, 'MFI001', 0, 0, 8000000, 0, 8000000, 0),
('5200', 14, 'MFI001', 0, 0, 15000000, 0, 15000000, 0),
('5300', 14, 'MFI001', 0, 0, 3000000, 0, 3000000, 0),
('5400', 14, 'MFI001', 0, 0, 3000000, 0, 3000000, 0),
('5500', 14, 'MFI001', 0, 0, 2000000, 0, 2000000, 0),
('5600', 14, 'MFI001', 0, 0, 8000000, 0, 8000000, 0),
('5700', 14, 'MFI001', 0, 0, 1000000, 0, 1000000, 0)
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 5E. Deposit Accounts
-- ══════════════════════════
INSERT INTO deposit_accounts (id, account_no, product_id, currency_id, opening_date, account_status, current_balance, accrued_interest, deposit_type_id) VALUES
(1, 'DEP-VTE-001', 1, (SELECT id FROM currencies WHERE code='LAK'), '2024-01-15', 'ACTIVE', 5000000, 20000, (SELECT id FROM deposit_types WHERE code='SAVINGS')),
(2, 'DEP-VTE-002', 2, (SELECT id FROM currencies WHERE code='LAK'), '2024-03-01', 'ACTIVE', 20000000, 300000, (SELECT id FROM deposit_types WHERE code='FIXED')),
(3, 'DEP-VTE-003', 1, (SELECT id FROM currencies WHERE code='LAK'), '2024-02-10', 'ACTIVE', 8000000, 35000, (SELECT id FROM deposit_types WHERE code='SAVINGS')),
(4, 'DEP-SVK-001', 1, (SELECT id FROM currencies WHERE code='LAK'), '2024-04-01', 'ACTIVE', 3000000, 12000, (SELECT id FROM deposit_types WHERE code='SAVINGS')),
(5, 'DEP-SVK-002', 3, (SELECT id FROM currencies WHERE code='LAK'), '2024-05-15', 'ACTIVE', 50000000, 1500000, (SELECT id FROM deposit_types WHERE code='FIXED')),
(6, 'DEP-LPB-001', 1, (SELECT id FROM currencies WHERE code='LAK'), '2024-06-01', 'ACTIVE', 2000000, 8000, (SELECT id FROM deposit_types WHERE code='SAVINGS')),
(7, 'DEP-CPS-001', 1, (SELECT id FROM currencies WHERE code='LAK'), '2024-03-10', 'ACTIVE', 4500000, 18000, (SELECT id FROM deposit_types WHERE code='SAVINGS')),
(8, 'DEP-KHM-001', 1, (SELECT id FROM currencies WHERE code='LAK'), '2024-07-01', 'ACTIVE', 1500000, 5000, (SELECT id FROM deposit_types WHERE code='SAVINGS'))
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 5F. Deposit Account Owners
-- ══════════════════════════
INSERT INTO deposit_account_owners (account_id, person_id) VALUES
(1, 101), (2, 103), (3, 105), (4, 111), (5, 113), (6, 118), (7, 124), (8, 131)
ON CONFLICT DO NOTHING;

-- Update sequences
SELECT setval('chart_of_accounts_id_seq', 100);
SELECT setval('fiscal_periods_id_seq', 50);
SELECT setval('deposit_accounts_id_seq', 50);
