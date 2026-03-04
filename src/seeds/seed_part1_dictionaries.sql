-- ═══════════════════════════════════════════════════
-- SEED PART 1: Dictionaries, Geography, Base Data
-- (fixed column names based on actual schema)
-- ═══════════════════════════════════════════════════

-- ── ເພດ (only: id, value) ──
INSERT INTO genders (value) VALUES ('ຊາຍ'), ('ຍິງ'), ('ອື່ນໆ') ON CONFLICT DO NOTHING;

-- ── ສະຖານະ ຄອບຄົວ (id, value, code, description) ──
INSERT INTO marital_statuses (value, code) VALUES
('ໂສດ', 'SINGLE'), ('ແຕ່ງງານ', 'MARRIED'), ('ຢ່າຮ້າງ', 'DIVORCED'), ('ໝ້າຍ', 'WIDOWED')
ON CONFLICT DO NOTHING;

-- ── ສັນຊາດ (nationality_id, code, description) ──
INSERT INTO nationality (code, description) VALUES
('LAO', 'ລາວ'), ('THA', 'ໄທ'), ('VNM', 'ຫວຽດນາມ'), ('CHN', 'ຈີນ'), ('JPN', 'ຍີ່ປຸ່ນ')
ON CONFLICT DO NOTHING;

-- ── ການສຶກສາ (id, value) ──
INSERT INTO educations (value) VALUES
('ປະຖົມ'), ('ມັດທະຍົມ'), ('ອະນຸປະລິນຍາ'), ('ປະລິນຍາຕີ'), ('ປະລິນຍາໂທ'), ('ປະລິນຍາເອກ')
ON CONFLICT DO NOTHING;

-- ── ອາຊີບ (id, value, value_en, code, description) ──
INSERT INTO careers (value, code) VALUES
('ກະສິກຳ', 'FARM'), ('ຄ້າຂາຍ', 'TRADE'), ('ລັດຖະກອນ', 'GOV'),
('ບໍລິສັດ', 'CORP'), ('ອິດສະລະ', 'FREE'), ('ນັກສຶກສາ', 'STUDENT'),
('ລ້ຽງສັດ', 'LIVESTOCK'), ('ຫັດຖະກຳ', 'CRAFT')
ON CONFLICT DO NOTHING;

-- ── ປະເພດ ລູກຄ້າ (id, value) ──
INSERT INTO customer_types (value) VALUES ('ບຸກຄົນ'), ('ວິສາຫະກິດ'), ('ກຸ່ມ') ON CONFLICT DO NOTHING;

-- ── ສະກຸນເງິນ (id, code, name, symbol) ──
INSERT INTO currencies (code, name, symbol) VALUES
('LAK', 'ກີບ', '₭'), ('THB', 'ບາດ', '฿'), ('USD', 'ໂດລາ', '$')
ON CONFLICT DO NOTHING;

-- ── ປະເພດ ທະນາຄານ (id, name) ──
INSERT INTO bank_type (name) VALUES ('ທະນາຄານ ພານິດ'), ('ສະຖາບັນ ການເງິນ'), ('ສະຫະກອນ') ON CONFLICT DO NOTHING;

-- ── ລະຫັດ ທະນາຄານ (id, bank_code, bank, name_e, name_l, bank_type_id) ──
INSERT INTO bank_code (bank_code, bank, name_e, name_l, bank_type_id) VALUES
('BCEL', 'BCEL', 'BCEL', 'ທະນາຄານ ການຄ້າຕ່າງປະເທດລາວ', 1),
('LDB', 'LDB', 'Lao Development Bank', 'ທະນາຄານ ພັດທະນາລາວ', 1),
('BFL', 'BFL', 'Banque Franco-Lao', 'ທະນາຄານ ຝຣັ່ງ-ລາວ', 1),
('JDB', 'JDB', 'Joint Development Bank', 'ທະນາຄານ ຮ່ວມພັດທະນາ', 1),
('APB', 'APB', 'Agriculture Promotion Bank', 'ທະນາຄານ ສົ່ງເສີມກະສິກຳ', 1)
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- ພູມສາດ: ລາວ
-- ══════════════════════════
INSERT INTO countries (value, code, description) VALUES ('ສປປ ລາວ', 'LAO', 'Lao PDR') ON CONFLICT DO NOTHING;

INSERT INTO provinces (value, code, value_en, country_id) VALUES
('ນະຄອນຫຼວງວຽງຈັນ', 'VTE', 'Vientiane Capital', (SELECT id FROM countries WHERE code='LAO')),
('ສະຫວັນນະເຂດ', 'SVK', 'Savannakhet', (SELECT id FROM countries WHERE code='LAO')),
('ຫຼວງພະບາງ', 'LPB', 'Luang Prabang', (SELECT id FROM countries WHERE code='LAO')),
('ຈຳປາສັກ', 'CPS', 'Champasak', (SELECT id FROM countries WHERE code='LAO')),
('ຄຳມ່ວນ', 'KHM', 'Khammouane', (SELECT id FROM countries WHERE code='LAO'))
ON CONFLICT DO NOTHING;

INSERT INTO districts (value, code, province_id) VALUES
('ຈັນທະບູລີ', 'CTB', (SELECT id FROM provinces WHERE code='VTE')),
('ສີໂຄດຕະບອງ', 'SKT', (SELECT id FROM provinces WHERE code='VTE')),
('ໄກສອນ', 'KS', (SELECT id FROM provinces WHERE code='SVK')),
('ຫຼວງພະບາງ', 'LPB-D', (SELECT id FROM provinces WHERE code='LPB')),
('ປາກເຊ', 'PKS', (SELECT id FROM provinces WHERE code='CPS'))
ON CONFLICT DO NOTHING;

INSERT INTO villages (value, code, district_id) VALUES
('ບ້ານ ໂພນທັນ', 'PT', (SELECT id FROM districts WHERE code='CTB')),
('ບ້ານ ສີສະຫວ່າງ', 'SSW', (SELECT id FROM districts WHERE code='CTB')),
('ບ້ານ ດອນກອຍ', 'DK', (SELECT id FROM districts WHERE code='SKT')),
('ບ້ານ ທ່າແຂກ', 'TK', (SELECT id FROM districts WHERE code='KS')),
('ບ້ານ ວັດໃໝ່', 'WM', (SELECT id FROM districts WHERE code='LPB-D')),
('ບ້ານ ທ່າຫີນ', 'TH', (SELECT id FROM districts WHERE code='PKS'))
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- ສິນເຊື່ອ Dictionaries
-- ══════════════════════════
INSERT INTO loan_categories (value) VALUES ('ສິນເຊື່ອ ທົ່ວໄປ'), ('ສິນເຊື່ອ ກະສິກຳ'), ('ສິນເຊື່ອ SME'), ('ສິນເຊື່ອ ອຸປະໂພກ') ON CONFLICT DO NOTHING;

INSERT INTO loan_classifications (value, code) VALUES
('ປົກກະຕິ', 'NORMAL'), ('ຈັບຕາເປັນພິເສດ', 'WATCH'),
('ຕ່ຳກວ່າມາດຕະຖານ', 'SUBSTANDARD'), ('ສົງໄສ', 'DOUBTFUL'), ('ສູນເສຍ', 'LOSS')
ON CONFLICT DO NOTHING;

INSERT INTO loan_types (value, code) VALUES ('ໄລຍະສັ້ນ', 'SHORT'), ('ໄລຍະກາງ', 'MEDIUM'), ('ໄລຍະຍາວ', 'LONG') ON CONFLICT DO NOTHING;

INSERT INTO loan_terms (code, description) VALUES ('3M', '3 ເດືອນ'), ('6M', '6 ເດືອນ'), ('12M', '12 ເດືອນ'), ('24M', '24 ເດືອນ'), ('36M', '36 ເດືອນ') ON CONFLICT DO NOTHING;

INSERT INTO loan_purpose (value, code) VALUES
('ກະສິກຳ', 'AGRI'), ('ຄ້າຂາຍ', 'TRADE'), ('ກໍ່ສ້າງ', 'CONST'),
('ການສຶກສາ', 'EDU'), ('ທີ່ຢູ່ອາໄສ', 'HOUSING'), ('ທຸລະກິດ', 'BIZ')
ON CONFLICT DO NOTHING;

INSERT INTO loan_funding_sources (value) VALUES ('ທຶນເອງ'), ('ກູ້ຢືມ BOL'), ('ກູ້ຢືມ ຕ່າງປະເທດ'), ('ເງິນຝາກ') ON CONFLICT DO NOTHING;

INSERT INTO borrower_connections (value) VALUES ('ຄອບຄົວ'), ('ພະນັກງານ'), ('ຜູ້ຖືຮຸ້ນ'), ('ບໍ່ກ່ຽວຂ້ອງ') ON CONFLICT DO NOTHING;

INSERT INTO collateral_categories (value, code) VALUES
('ທີ່ດິນ', 'LAND'), ('ເຮືອນ', 'HOUSE'), ('ລົດ', 'VEHICLE'),
('ເຄື່ອງຈັກ', 'MACHINE'), ('ຄ້ຳປະກັນ ບຸກຄົນ', 'PERSON'), ('ເງິນຝາກ', 'DEPOSIT')
ON CONFLICT DO NOTHING;

INSERT INTO land_size_units (code, description) VALUES ('SQM', 'ຕາແມັດ'), ('RAI', 'ໄລ່'), ('HA', 'ເຮັກຕາ') ON CONFLICT DO NOTHING;

INSERT INTO economic_sectors (value) VALUES ('ກະສິກຳ'), ('ອຸດສາຫະກຳ'), ('ບໍລິການ'), ('ການຄ້າ') ON CONFLICT DO NOTHING;
INSERT INTO economic_branches (value) VALUES ('ປູກຝັງ'), ('ລ້ຽງສັດ'), ('ຫັດຖະກຳ'), ('ຂາຍຍ່ອຍ'), ('ຂົນສົ່ງ'), ('ກໍ່ສ້າງ') ON CONFLICT DO NOTHING;

INSERT INTO ecl_parameters (loan_category, stage, pd_rate, lgd_rate, stage_threshold_days, effective_date) VALUES
('GENERAL', 1, 0.02, 0.45, 30, '2025-01-01'),
('GENERAL', 2, 0.10, 0.55, 90, '2025-01-01'),
('GENERAL', 3, 0.50, 0.80, 180, '2025-01-01')
ON CONFLICT DO NOTHING;

INSERT INTO deposit_types (value, code) VALUES ('ອອມຊັບ', 'SAVINGS'), ('ກະແສ', 'CURRENT'), ('ປະຈຳ', 'FIXED') ON CONFLICT DO NOTHING;

INSERT INTO enterprise_types (value, code) VALUES
('ບໍລິສັດ ຈຳກັດ', 'LTD'), ('ວິສາຫະກິດສ່ວນບຸກຄົນ', 'SOLE'), ('ຫ້າງຮຸ້ນສ່ວນ', 'PART'), ('ສະຫະກອນ', 'COOP')
ON CONFLICT DO NOTHING;

INSERT INTO enterprise_sizes (value) VALUES ('ນ້ອຍ'), ('ນ້ອຍ-ກາງ'), ('ກາງ'), ('ໃຫຍ່') ON CONFLICT DO NOTHING;

INSERT INTO enterprise_categories (value, code) VALUES ('ຜະລິດ', 'MFG'), ('ບໍລິການ', 'SVC'), ('ການຄ້າ', 'TRADE'), ('ກະສິກຳ', 'AGRI') ON CONFLICT DO NOTHING;

INSERT INTO account_categories (code, name_lo, name_en, normal_balance, sort_order) VALUES
('ASSET', 'ຊັບສິນ', 'Assets', 'DEBIT', 1),
('LIABILITY', 'ໜີ້ສິນ', 'Liabilities', 'CREDIT', 2),
('EQUITY', 'ທຶນ', 'Equity', 'CREDIT', 3),
('REVENUE', 'ລາຍຮັບ', 'Revenue', 'CREDIT', 4),
('EXPENSE', 'ລາຍຈ່າຍ', 'Expenses', 'DEBIT', 5)
ON CONFLICT DO NOTHING;

-- ── Roles ──
INSERT INTO roles (code, name, description, is_system) VALUES
('SUPER_ADMIN', 'Super Admin', 'ຜູ້ຄວບຄຸມ ລະບົບ ທັງໝົດ', true),
('INST_ADMIN', 'Institution Admin', 'ຜູ້ບໍລິຫານ ສະຖາບັນ', false),
('MANAGER', 'Branch Manager', 'ຜູ້ຈັດການ ສາຂາ', false),
('OFFICER', 'Loan Officer', 'ພະນັກງານ ສິນເຊື່ອ', false),
('COLLECTOR', 'Collection Officer', 'ພະນັກງານ ຕິດຕາມ ໜີ້', false)
ON CONFLICT DO NOTHING;
