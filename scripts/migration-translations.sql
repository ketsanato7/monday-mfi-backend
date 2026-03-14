-- ═══════════════════════════════════════════════════════
-- Migration: Create translations table for i18n from DB
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,          -- e.g. "loan.contract_no"
    value_LA TEXT NOT NULL DEFAULT '',          -- ພາສາລາວ
    value_EN TEXT NOT NULL DEFAULT '',          -- English
    value_TH TEXT NOT NULL DEFAULT '',          -- ภาษาไทย
    module VARCHAR(100),                        -- e.g. "loan", "customer", "deposit"
    description TEXT,                           -- ຄຳອະທິບາຍ
    org_id INTEGER,                             -- Multi-tenant (optional)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations (key);
CREATE INDEX IF NOT EXISTS idx_translations_module ON translations (module);
CREATE INDEX IF NOT EXISTS idx_translations_org ON translations (org_id);

-- ══════ Sample Data ══════
INSERT INTO translations (key, value_LA, value_EN, value_TH, module) VALUES
  ('common.save', 'ບັນທຶກ', 'Save', 'บันทึก', 'common'),
  ('common.cancel', 'ຍົກເລີກ', 'Cancel', 'ยกเลิก', 'common'),
  ('common.delete', 'ລຶບ', 'Delete', 'ลบ', 'common'),
  ('common.edit', 'ແກ້ໄຂ', 'Edit', 'แก้ไข', 'common'),
  ('common.add', 'ເພີ່ມໃໝ່', 'Add New', 'เพิ่มใหม่', 'common'),
  ('common.search', 'ຄົ້ນຫາ', 'Search', 'ค้นหา', 'common'),
  ('common.export', 'ສົ່ງອອກ', 'Export', 'ส่งออก', 'common'),
  ('common.print', 'ພິມ', 'Print', 'พิมพ์', 'common'),
  ('common.confirm', 'ຢືນຢັນ', 'Confirm', 'ยืนยัน', 'common'),
  ('common.back', 'ກັບຄືນ', 'Back', 'กลับ', 'common'),
  ('common.loading', 'ກຳລັງໂຫຼດ...', 'Loading...', 'กำลังโหลด...', 'common'),
  ('common.no_data', 'ບໍ່ມີຂໍ້ມູນ', 'No Data', 'ไม่มีข้อมูล', 'common'),
  ('loan.contract_no', 'ເລກສັນຍາ', 'Contract No.', 'เลขสัญญา', 'loan'),
  ('loan.borrower', 'ຜູ້ກູ້', 'Borrower', 'ผู้กู้', 'loan'),
  ('loan.amount', 'ຈຳນວນເງິນ', 'Amount', 'จำนวนเงิน', 'loan'),
  ('loan.interest_rate', 'ອັດຕາດອກເບ້ຍ', 'Interest Rate', 'อัตราดอกเบี้ย', 'loan'),
  ('loan.status', 'ສະຖານະ', 'Status', 'สถานะ', 'loan'),
  ('loan.approved', 'ອະນຸມັດ', 'Approved', 'อนุมัติ', 'loan'),
  ('loan.pending', 'ລໍຖ້າ', 'Pending', 'รอดำเนินการ', 'loan'),
  ('loan.rejected', 'ປະຕິເສດ', 'Rejected', 'ปฏิเสธ', 'loan'),
  ('customer.name', 'ຊື່ລູກຄ້າ', 'Customer Name', 'ชื่อลูกค้า', 'customer'),
  ('customer.phone', 'ເບີໂທ', 'Phone', 'โทรศัพท์', 'customer'),
  ('customer.address', 'ທີ່ຢູ່', 'Address', 'ที่อยู่', 'customer'),
  ('deposit.account', 'ບັນຊີເງິນຝາກ', 'Deposit Account', 'บัญชีเงินฝาก', 'deposit'),
  ('deposit.balance', 'ຍອດເງິນ', 'Balance', 'ยอดเงิน', 'deposit')
ON CONFLICT (key) DO NOTHING;
