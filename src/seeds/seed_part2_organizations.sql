-- ═══════════════════════════════════════════════════
-- SEED PART 2: Organizations, MFI, Branches, Employees, Users
-- 5 ສະ ຖາ ບັນ ການ ເງິນ ຈຸ ລະ ພາກ
-- ═══════════════════════════════════════════════════

-- ══════════════════════════
-- 2A. Position Categories
-- ══════════════════════════
INSERT INTO categories (code, description) VALUES
('POS-DIR', 'ຜູ້ ອຳ ນວຍ ການ'), ('POS-MGR', 'ຜູ້ ຈັດ ການ ສາ ຂາ'),
('POS-LO', 'ພະ ນັກ ງານ ສິນ ເຊື່ອ'), ('POS-DEP', 'ພະ ນັກ ງານ ເງິນ ຝາກ'),
('POS-ACC', 'ພະ ນັກ ງານ ບັນ ຊີ'), ('POS-COL', 'ພະ ນັກ ງານ ຕິດ ຕາມ ໜີ້'),
('POS-IT', 'ພະ ນັກ ງານ IT'), ('POS-GEN', 'ພະ ນັກ ງານ ທົ່ວ ໄປ')
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 2B. Organizations (5 orgs)
-- ══════════════════════════
INSERT INTO organizations (code, name, business_type, tax_id, address, phone_number, "createdAt", "updatedAt") VALUES
('MFI-VTE', 'ສະ ຖາ ບັນ ການ ເງິນ ຈຸ ລະ ພາກ ວຽງ ຈັນ', 'MFI', '0100-000-001', 'ຖະ ໜົນ ສາ ມ ແສນ ໄທ, ວຽງ ຈັນ', '021-215-001', NOW(), NOW()),
('MFI-SVK', 'ສະ ຖາ ບັນ ການ ເງິນ ສະ ຫວັນ ນະ ເຂດ', 'MFI', '0100-000-002', 'ຖະ ໜົນ ໄກ ສອນ, ສະ ຫວັນ', '041-212-002', NOW(), NOW()),
('COOP-LPB', 'ສະ ຫະ ກອນ ກະ ສິ ກຳ ຫຼວງ ພະ ບາງ', 'Cooperative', '0100-000-003', 'ຖະ ໜົນ ສາ ກົນ ນະ ຄອນ, ຫຼວງ ພະ ບາງ', '071-212-003', NOW(), NOW()),
('FIN-CPS', 'ບໍ ລິ ສັດ ສິນ ເຊື່ອ ຈຳ ປາ ສັກ', 'Leasing', '0100-000-004', 'ຖະ ໜົນ 13, ປາ ກ ເຊ', '031-212-004', NOW(), NOW()),
('FUND-KHM', 'ກອງ ທຶນ ຈຸ ລະ ພາກ ຄຳ ມ່ວນ', 'Fund', '0100-000-005', 'ຖະ ໜົນ ທ່າ ແຂກ, ຄຳ ມ່ວນ', '051-212-005', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 2C. MFI Info (5 institutions)
-- ══════════════════════════
INSERT INTO mfi_info (id, approved_date, name__l_a, name__e_n, village_id, address, house_unit, house_no, license_no, branches, service_units, employees, employees_female, employees__h_q, employees_female__h_q, tel, mobile, fax, email, whatsapp, website, other_info, latitude, longitude) VALUES
('MFI001', '2020-03-15', 'ສະ ຖາ ບັນ ການ ເງິນ ຈຸ ລະ ພາກ ວຽງ ຈັນ', 'Vientiane Microfinance Institution', 1, 'ຖະ ໜົນ ສາ ມ ແສນ ໄທ', 'ໜ່ວຍ 01', '123', 'MFI/BOL/2020-001', 2, 4, 10, 5, 6, 3, '021-215-001', '020-5555-0001', '021-215-999', 'info@vtemfi.la', '020-5555-0001', 'www.vtemfi.la', 'ສະ ຖາ ບັນ ຊັ້ນ ນຳ', '17.9757', '102.6331'),
('MFI002', '2019-08-20', 'ສະ ຖາ ບັນ ການ ເງິນ ສະ ຫວັນ', 'Savannakhet Microfinance', 4, 'ຖະ ໜົນ ໄກ ສອນ', 'ໜ່ວຍ 01', '456', 'MFI/BOL/2019-002', 1, 2, 6, 3, 4, 2, '041-212-002', '020-5555-0002', '041-212-999', 'info@svkmfi.la', '020-5555-0002', 'www.svkmfi.la', 'ບໍ ລິ ການ ກະ ສິ ກຳ', '16.5561', '104.7502'),
('MFI003', '2021-01-10', 'ສະ ຫະ ກອນ ກະ ສິ ກຳ ຫຼວງ ພະ ບາງ', 'Luang Prabang Agriculture Cooperative', 5, 'ຖະ ໜົນ ສາ ກົນ ນະ ຄອນ', 'ໜ່ວຍ 01', '789', 'COOP/BOL/2021-003', 1, 2, 5, 2, 3, 1, '071-212-003', '020-5555-0003', '071-212-999', 'info@lpbcoop.la', '020-5555-0003', 'www.lpbcoop.la', 'ສະ ຫະ ກອນ ເຂດ ຊົນ ນະ ບົດ', '19.8856', '102.1347'),
('MFI004', '2018-05-25', 'ບໍ ລິ ສັດ ສິນ ເຊື່ອ ຈຳ ປາ ສັກ', 'Champasak Finance Company', 6, 'ຖະ ໜົນ 13', 'ໜ່ວຍ 01', '101', 'FIN/BOL/2018-004', 1, 2, 5, 3, 3, 2, '031-212-004', '020-5555-0004', '031-212-999', 'info@cpsfin.la', '020-5555-0004', 'www.cpsfin.la', 'ລີ ສ ຊິ ງ ແລະ ສິນ ເຊື່ອ', '15.1200', '105.7991'),
('MFI005', '2022-11-01', 'ກອງ ທຶນ ຈຸ ລະ ພາກ ຄຳ ມ່ວນ', 'Khammouane Microfinance Fund', 4, 'ຖະ ໜົນ ທ່າ ແຂກ', 'ໜ່ວຍ 01', '202', 'FUND/BOL/2022-005', 1, 1, 4, 2, 3, 1, '051-212-005', '020-5555-0005', '051-212-999', 'info@khmfund.la', '020-5555-0005', 'www.khmfund.la', 'ກອງ ທຶນ ຊຸມ ຊົນ', '17.3944', '104.8000')
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 2D. MFI Branches (6 branches)
-- ══════════════════════════
INSERT INTO mfi_branches_info (id, approved_date, name__l_a, name__e_n, village_id, address, house_unit, house_no, license_no, service_units, employees, employees_female, tel, mobile, fax, email, whatsapp, website, other_infos, latitude, longitude, mfi_info_id) VALUES
('BR001', '2020-06-01', 'ສາ ຂາ ຈັນ ທະ ບູ ລີ', 'Chanthabuly Branch', 1, 'ຈັນ ທະ ບູ ລີ', '01', '10', 'BR/001', 2, 5, 3, '021-215-101', '020-5550-0101', '021-215-101', 'ctb@vtemfi.la', '020-5550-0101', 'www.vtemfi.la', '-', '17.9700', '102.6300', 'MFI001'),
('BR002', '2020-06-01', 'ສາ ຂາ ສີ ໂຄດ ຕະ ບອງ', 'Sikhottabong Branch', 3, 'ສີ ໂຄດ ຕະ ບອງ', '01', '20', 'BR/002', 2, 5, 2, '021-215-102', '020-5550-0102', '021-215-102', 'skt@vtemfi.la', '020-5550-0102', 'www.vtemfi.la', '-', '17.9600', '102.5900', 'MFI001'),
('BR003', '2019-09-15', 'ສາ ຂາ ໄກ ສອນ', 'Kaisone Branch', 4, 'ໄກ ສອນ ພົມ ວິ ຫານ', '01', '30', 'BR/003', 2, 6, 3, '041-212-101', '020-5550-0103', '041-212-101', 'ks@svkmfi.la', '020-5550-0103', 'www.svkmfi.la', '-', '16.5500', '104.7500', 'MFI002'),
('BR004', '2021-02-01', 'ສາ ຂາ ຫຼວງ ພະ ບາງ', 'Luang Prabang Branch', 5, 'ວັດ ໃໝ່', '01', '40', 'BR/004', 2, 5, 2, '071-212-101', '020-5550-0104', '071-212-101', 'lpb@coop.la', '020-5550-0104', 'www.lpbcoop.la', '-', '19.8800', '102.1300', 'MFI003'),
('BR005', '2018-07-01', 'ສາ ຂາ ປາ ກ ເຊ', 'Pakse Branch', 6, 'ປາ ກ ເຊ', '01', '50', 'BR/005', 2, 5, 3, '031-212-101', '020-5550-0105', '031-212-101', 'pks@cpsfin.la', '020-5550-0105', 'www.cpsfin.la', '-', '15.1100', '105.7900', 'MFI004'),
('BR006', '2022-12-01', 'ສາ ຂາ ທ່າ ແຂກ', 'Thakhek Branch', 4, 'ທ່າ ແຂກ', '01', '60', 'BR/006', 1, 4, 2, '051-212-101', '020-5550-0106', '051-212-101', 'tk@khmfund.la', '020-5550-0106', 'www.khmfund.la', '-', '17.3900', '104.7900', 'MFI005')
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 2E. Employees (30 employees across 5 MFIs)
-- ══════════════════════════
INSERT INTO employees (id, employee_code, hire_date, employment_type, status, education_level_id, contact_info) VALUES
-- MFI001 ວຽງ ຈັນ (10 ຄົນ)
(1, 'VTE-001', '2020-03-15', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0001'),
(2, 'VTE-002', '2020-04-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0002'),
(3, 'VTE-003', '2020-05-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0003'),
(4, 'VTE-004', '2020-06-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0004'),
(5, 'VTE-005', '2020-06-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0005'),
(6, 'VTE-006', '2020-07-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0006'),
(7, 'VTE-007', '2020-07-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0007'),
(8, 'VTE-008', '2021-01-15', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0008'),
(9, 'VTE-009', '2021-03-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0009'),
(10, 'VTE-010', '2021-06-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0010'),
-- MFI002 ສະ ຫວັນ (6 ຄົນ)
(11, 'SVK-001', '2019-08-20', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0011'),
(12, 'SVK-002', '2019-09-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0012'),
(13, 'SVK-003', '2019-10-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0013'),
(14, 'SVK-004', '2020-01-15', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0014'),
(15, 'SVK-005', '2020-03-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0015'),
(16, 'SVK-006', '2020-06-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0016'),
-- MFI003 ຫຼວງ ພະ ບາງ (5 ຄົນ)
(17, 'LPB-001', '2021-01-10', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0017'),
(18, 'LPB-002', '2021-02-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0018'),
(19, 'LPB-003', '2021-03-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0019'),
(20, 'LPB-004', '2021-04-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0020'),
(21, 'LPB-005', '2021-06-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0021'),
-- MFI004 ຈຳ ປາ ສັກ (5 ຄົນ)
(22, 'CPS-001', '2018-05-25', 'FULL_TIME', 'ACTIVE', 5, '020-9900-0022'),
(23, 'CPS-002', '2018-06-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0023'),
(24, 'CPS-003', '2018-07-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0024'),
(25, 'CPS-004', '2019-01-15', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0025'),
(26, 'CPS-005', '2019-06-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0026'),
-- MFI005 ຄຳ ມ່ວນ (4 ຄົນ)
(27, 'KHM-001', '2022-11-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0027'),
(28, 'KHM-002', '2022-12-01', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0028'),
(29, 'KHM-003', '2023-01-15', 'FULL_TIME', 'ACTIVE', 3, '020-9900-0029'),
(30, 'KHM-004', '2023-03-01', 'FULL_TIME', 'ACTIVE', 4, '020-9900-0030')
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 2F. Employee ↔ Position (junction)
-- ══════════════════════════
INSERT INTO employee_positions (employee_id, position_id) VALUES
(1, (SELECT id FROM categories WHERE code='POS-DIR')),
(2, (SELECT id FROM categories WHERE code='POS-MGR')),
(3, (SELECT id FROM categories WHERE code='POS-LO')),
(4, (SELECT id FROM categories WHERE code='POS-LO')),
(5, (SELECT id FROM categories WHERE code='POS-DEP')),
(6, (SELECT id FROM categories WHERE code='POS-ACC')),
(7, (SELECT id FROM categories WHERE code='POS-COL')),
(8, (SELECT id FROM categories WHERE code='POS-LO')),
(9, (SELECT id FROM categories WHERE code='POS-IT')),
(10, (SELECT id FROM categories WHERE code='POS-GEN')),
(11, (SELECT id FROM categories WHERE code='POS-DIR')),
(12, (SELECT id FROM categories WHERE code='POS-MGR')),
(13, (SELECT id FROM categories WHERE code='POS-LO')),
(14, (SELECT id FROM categories WHERE code='POS-LO')),
(15, (SELECT id FROM categories WHERE code='POS-ACC')),
(16, (SELECT id FROM categories WHERE code='POS-COL')),
(17, (SELECT id FROM categories WHERE code='POS-DIR')),
(18, (SELECT id FROM categories WHERE code='POS-LO')),
(19, (SELECT id FROM categories WHERE code='POS-LO')),
(20, (SELECT id FROM categories WHERE code='POS-ACC')),
(21, (SELECT id FROM categories WHERE code='POS-COL')),
(22, (SELECT id FROM categories WHERE code='POS-DIR')),
(23, (SELECT id FROM categories WHERE code='POS-LO')),
(24, (SELECT id FROM categories WHERE code='POS-LO')),
(25, (SELECT id FROM categories WHERE code='POS-DEP')),
(26, (SELECT id FROM categories WHERE code='POS-COL')),
(27, (SELECT id FROM categories WHERE code='POS-DIR')),
(28, (SELECT id FROM categories WHERE code='POS-LO')),
(29, (SELECT id FROM categories WHERE code='POS-LO')),
(30, (SELECT id FROM categories WHERE code='POS-ACC'))
ON CONFLICT DO NOTHING;

-- ══════════════════════════
-- 2G. Users + User Roles
-- ══════════════════════════
INSERT INTO users (id, username, password_hash, employee_id, is_active) VALUES
(1, 'admin_vte', '$2b$10$dummy_hash_admin_vte_000001', 1, true),
(2, 'mgr_vte_1', '$2b$10$dummy_hash_mgr_vte_000002', 2, true),
(3, 'officer_vte_1', '$2b$10$dummy_hash_off_vte_000003', 3, true),
(4, 'officer_vte_2', '$2b$10$dummy_hash_off_vte_000004', 4, true),
(5, 'admin_svk', '$2b$10$dummy_hash_admin_svk_000005', 11, true),
(6, 'officer_svk_1', '$2b$10$dummy_hash_off_svk_000006', 13, true),
(7, 'admin_lpb', '$2b$10$dummy_hash_admin_lpb_000007', 17, true),
(8, 'officer_lpb_1', '$2b$10$dummy_hash_off_lpb_000008', 18, true),
(9, 'admin_cps', '$2b$10$dummy_hash_admin_cps_000009', 22, true),
(10, 'officer_cps_1', '$2b$10$dummy_hash_off_cps_000010', 23, true),
(11, 'admin_khm', '$2b$10$dummy_hash_admin_khm_000011', 27, true),
(12, 'officer_khm_1', '$2b$10$dummy_hash_off_khm_000012', 28, true)
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES
(1, (SELECT id FROM roles WHERE code='INST_ADMIN')),
(2, (SELECT id FROM roles WHERE code='MANAGER')),
(3, (SELECT id FROM roles WHERE code='OFFICER')),
(4, (SELECT id FROM roles WHERE code='OFFICER')),
(5, (SELECT id FROM roles WHERE code='INST_ADMIN')),
(6, (SELECT id FROM roles WHERE code='OFFICER')),
(7, (SELECT id FROM roles WHERE code='INST_ADMIN')),
(8, (SELECT id FROM roles WHERE code='OFFICER')),
(9, (SELECT id FROM roles WHERE code='INST_ADMIN')),
(10, (SELECT id FROM roles WHERE code='OFFICER')),
(11, (SELECT id FROM roles WHERE code='INST_ADMIN')),
(12, (SELECT id FROM roles WHERE code='OFFICER'))
ON CONFLICT DO NOTHING;
