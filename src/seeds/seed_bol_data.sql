-- ═══════════════════════════════════════════════════════════════
-- Seed Test Data ​ສຳ​ລັບ​ລາຍ​ງານ BOL (F01-F12)
-- ​ບໍ່​ປ່ຽນ​ໂຄງ​ສ້າງ DB — insert data ​ເທົ່າ​ນັ້ນ
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══ 1. ​ລູກ​ຄ້າ (borrowers_individual) — ​ສຳ​ລັບ F04-F09 ═══
INSERT INTO borrowers_individual (borrower_id, firstname__l_a, lastname__l_a, firstname__e_n, lastname__e_n, dateofbirth, gender_id, mobile_no)
VALUES
  (1001, 'ສົມ​ພອນ', 'ສີ​ສະ​ຫວາດ', 'Somphone', 'Sisavath', '1985-03-15', 1, '020-55551111'),
  (1002, 'ບຸນ​ມີ', 'ວົງ​ສະ​ຫວັນ', 'Bounmy', 'Vongsavanh', '1990-07-20', 2, '020-55552222'),
  (1003, 'ຄຳ​ພອນ', 'ພົມ​ມະ​ຈັນ', 'Khamphone', 'Phommachan', '1978-11-01', 1, '020-55553333'),
  (1004, 'ນາງ ​ສີ​ດາ', 'ພັນ​ທະ​ວົງ', 'Sida', 'Phanthavong', '1995-01-10', 2, '020-55554444'),
  (1005, 'ວິ​ໄລ​ພອນ', 'ຈັນ​ທະ​ລາ', 'Vilayphon', 'Chanthala', '1988-06-25', 1, '020-55555555');

-- ═══ 2. ​ສັນ​ຍາ​ກູ້ (loan_contracts) — ​ສຳ​ລັບ F04-F09 ═══
-- 4 ​ສັນ​ຍາ ACTIVE ​ປົກ​ກະ​ຕິ (classification_id=1) → F04
INSERT INTO loan_contracts (contract_no, currency_id, approved_amount, interest_rate, term_months, disbursement_date, maturity_date, loan_purpose_id, loan_status, classification_id, remaining_balance)
VALUES
  ('LC-2025-001', 1, 5000000.00, 18.00, 12, '2025-01-15', '2026-01-15', 4, 'ACTIVE', 1, 4500000.00),
  ('LC-2025-002', 1, 10000000.00, 15.00, 24, '2025-02-01', '2027-02-01', 5, 'ACTIVE', 1, 9000000.00),
  ('LC-2025-003', 1, 3000000.00, 20.00, 6, '2025-03-10', '2025-09-10', 6, 'ACTIVE', 1, 2500000.00),
  ('LC-2025-004', 1, 8000000.00, 16.00, 18, '2025-04-01', '2026-10-01', 7, 'ACTIVE', 1, 7000000.00);

-- 1 ​ສັນ​ຍາ ​ປັບ​ປຸງ​ໂຄງ​ສ້າງ (restructured_date ≠ null) → F05
INSERT INTO loan_contracts (contract_no, currency_id, approved_amount, interest_rate, term_months, disbursement_date, maturity_date, loan_purpose_id, loan_status, classification_id, remaining_balance)
VALUES
  ('LC-2025-005', 1, 15000000.00, 12.00, 36, '2024-06-01', '2027-06-01', 8, 'ACTIVE', 2, 12000000.00);

-- 1 ​ສັນ​ຍາ ​ໂອນ (status=TRANSFERRED) → F06
INSERT INTO loan_contracts (contract_no, currency_id, approved_amount, interest_rate, term_months, disbursement_date, maturity_date, loan_purpose_id, loan_status, classification_id, remaining_balance)
VALUES
  ('LC-2025-006', 1, 7000000.00, 18.00, 12, '2024-01-01', '2025-01-01', 4, 'TRANSFERRED', 3, 5000000.00);

-- 1 ​ສັນ​ຍາ ​ພົວ​ພັນ (borrower_connection_id ≠ null) → F07
INSERT INTO loan_contracts (contract_no, currency_id, approved_amount, interest_rate, term_months, disbursement_date, maturity_date, loan_purpose_id, loan_status, classification_id, remaining_balance, borrower_connection_id)
VALUES
  ('LC-2025-007', 1, 20000000.00, 14.00, 24, '2025-01-01', '2027-01-01', 5, 'ACTIVE', 1, 18000000.00, 1);

-- 1 ​ສັນ​ຍາ ​ລາຍ​ໃຫຍ່ (approved_amount ≥ 50​ລ​້ານ) → F08
INSERT INTO loan_contracts (contract_no, currency_id, approved_amount, interest_rate, term_months, disbursement_date, maturity_date, loan_purpose_id, loan_status, classification_id, remaining_balance)
VALUES
  ('LC-2025-008', 1, 80000000.00, 12.00, 48, '2025-05-01', '2029-05-01', 6, 'ACTIVE', 1, 75000000.00);

-- ═══ 3. ​ບັນ​ຊີ​ເງິນ​ຝາກ (deposit_accounts) — ​ສຳ​ລັບ F10-F11 ═══
INSERT INTO deposit_accounts (account_no, product_id, currency_id, opening_date, account_status, current_balance, accrued_interest)
VALUES
  ('002-01-0000002', 1, 1, '2025-01-10', 'ACTIVE', 15000000.00, 225000.00),
  ('002-01-0000003', 2, 1, '2025-02-15', 'ACTIVE', 8000000.00, 120000.00),
  ('002-01-0000004', 3, 1, '2025-03-01', 'ACTIVE', 25000000.00, 500000.00),
  ('002-01-0000005', 1, 2, '2025-04-20', 'ACTIVE', 5000.00, 50.00);

-- ═══ 4. ​ລາຍ​ການ​ບັນ​ຊີ (journal_entries + lines) — ​ສຳ​ລັບ F01-F03 ═══

-- Entry 1: ​ຮັບ​ທຶນ​ຈົດ​ທະ​ບຽນ (​ເງິນ​ສົດ​ເພີ່ມ, ​ທຶນ​ເພີ່ມ)
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-01-01', 'JE-2025-001', 'ຮັບທຶນຈົດທະບຽນເບື້ອງຕົ້ນ', 'LAK', 'POSTED', 500000000.00, 500000000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES
  (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 500000000.00, 0.00),     -- Account 3 = ​ເງິນ​ສົດ​ໃນ​ຄັງ (ASSET)
  (currval('journal_entries_id_seq'), 1266, 'ທຶນຈົດທະບຽນ', 0.00, 500000000.00);   -- Account 1266 = ​ທຶນ​ຈົດ​ທະ​ບຽນ (EQUITY)

-- Entry 2: ​ປ່ອຍ​ກູ້ (​ເງິນ​ສົດ​ຫຼຸດ, ​ລູກ​ໜີ້​ເພີ່ມ)
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-01-15', 'JE-2025-002', 'ປ່ອຍກູ້ຢືມ ສັນຍາ LC-2025-001', 'LAK', 'POSTED', 5000000.00, 5000000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
SELECT currval('journal_entries_id_seq'), id, 'ລູກໜີ້ສິນເຊື່ອ', 5000000.00, 0.00
FROM chart_of_accounts WHERE account_code = '14111' LIMIT 1;
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 0.00, 5000000.00);

-- Entry 3: ​ຮັບ​ເງິນ​ຝາກ ​ຈາກ​ລູກ​ຄ້າ
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-01-20', 'JE-2025-003', 'ຮັບເງິນຝາກປະຢັດລູກຄ້າ', 'LAK', 'POSTED', 15000000.00, 15000000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES
  (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 15000000.00, 0.00),
  (currval('journal_entries_id_seq'), 982, 'ໜີ້ເງິນຝາກລູກຄ້າ', 0.00, 15000000.00);

-- Entry 4: ​ລາຍ​ຮັບ​ດອກ​ເບ້ຍ​ສິນ​ເຊື່ອ
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-02-15', 'JE-2025-004', 'ດອກເບ້ຍຮັບຈາກສິນເຊື່ອ', 'LAK', 'POSTED', 750000.00, 750000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES
  (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 750000.00, 0.00),
  (currval('journal_entries_id_seq'), 1617, 'ລາຍຮັບດອກເບ້ຍ', 0.00, 750000.00);

-- Entry 5: ​ຄ່າ​ໃຊ້​ຈ່າຍ​ເງິນ​ເດືອນ
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-02-28', 'JE-2025-005', 'ຈ່າຍເງິນເດືອນພະນັກງານ', 'LAK', 'POSTED', 3000000.00, 3000000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES
  (currval('journal_entries_id_seq'), 1343, 'ຄ່າໃຊ້ຈ່າຍເງິນເດືອນ', 3000000.00, 0.00),
  (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 0.00, 3000000.00);

-- Entry 6: ​ປ່ອຍ​ກູ້​ ​ເພີ່ມ
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-03-10', 'JE-2025-006', 'ປ່ອຍກູ້ ສັນຍາ LC-2025-002 ແລະ LC-2025-003', 'LAK', 'POSTED', 13000000.00, 13000000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
SELECT currval('journal_entries_id_seq'), id, 'ລູກໜີ້ສິນເຊື່ອ', 13000000.00, 0.00
FROM chart_of_accounts WHERE account_code = '14111' LIMIT 1;
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 0.00, 13000000.00);

-- Entry 7: ​ຮັບ​ເງິນ​ຝາກ ​ເພີ່ມ
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-04-01', 'JE-2025-007', 'ຮັບເງິນຝາກປະຈຳ', 'LAK', 'POSTED', 25000000.00, 25000000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES
  (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 25000000.00, 0.00),
  (currval('journal_entries_id_seq'), 982, 'ເງິນຝາກລູກຄ້າ', 0.00, 25000000.00);

-- Entry 8: ​ລາຍ​ຮັບ​ດອກ​ເບ້ຍ ​ເດືອນ 3
INSERT INTO journal_entries (transaction_date, reference_no, description, currency_code, status, total_debit, total_credit)
VALUES ('2025-03-31', 'JE-2025-008', 'ດອກເບ້ຍຮັບ ເດືອນ 3', 'LAK', 'POSTED', 1200000.00, 1200000.00);
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
VALUES
  (currval('journal_entries_id_seq'), 3, 'ເງິນສົດໃນຄັງ', 1200000.00, 0.00),
  (currval('journal_entries_id_seq'), 1617, 'ລາຍຮັບດອກເບ້ຍ', 0.00, 1200000.00);

-- ═══ 5. ​ຮຸ້ນ​ສະ​ມາ​ຊິກ (member_shares) — ​ສຳ​ລັບ F12 ═══
INSERT INTO member_shares (member_type_id, from_date, to_date, initial_contribution, contribution, withdrawal, remaining_balance)
VALUES
  (1, '2025-01-01', '2025-12-31', '5000000', '2000000', '0', '7000000'),
  (1, '2025-01-01', '2025-12-31', '3000000', '1000000', '500000', '3500000');

COMMIT;
