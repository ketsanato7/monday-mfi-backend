-- ═══════════════════════════════════════════════════════
-- HR SYSTEM: Phase 1 — Tables + Seed Data
-- ═══════════════════════════════════════════════════════
-- ✅ 8 tables ໃໝ່ + ປ່ຽນ employees + seed data
-- ═══════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════
-- 1. leave_types — ປະ ເພດ ການ ລາ ພັກ
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name_la VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    max_days_per_year INTEGER,
    is_paid BOOLEAN DEFAULT true,
    requires_document BOOLEAN DEFAULT false,
    gender_restriction VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

INSERT INTO leave_types (code, name_la, name_en, max_days_per_year, is_paid, requires_document, gender_restriction) VALUES
('ANNUAL',    'ລາ ພັກ ຜ່ອນ ປະ ຈຳ ປີ',     'Annual Leave',       15, true,  false, NULL),
('SICK',      'ລາ ເຈັບ',                      'Sick Leave',         30, true,  true,  NULL),
('MATERNITY', 'ລາ ເກີດ ລູກ',                  'Maternity Leave',   105, true,  true,  'F'),
('PATERNITY', 'ລາ ເບິ່ງ ແຍງ ເມຍ ເກີດ',       'Paternity Leave',    3, true,  false, 'M'),
('WEDDING',   'ລາ ແຕ່ງ ງານ',                 'Wedding Leave',       3, true,  false, NULL),
('FUNERAL',   'ລາ ງານ ສົບ ຄອບ ຄົວ',           'Funeral Leave',       3, true,  false, NULL),
('UNPAID',    'ລາ ບໍ່ ໄດ້ ຮັບ ເງິນ ເດືອນ',    'Unpaid Leave',     NULL, false, false, NULL),
('PERSONAL',  'ລາ ກິດ ສ່ວນ ຕົວ',              'Personal Leave',      5, true,  false, NULL),
('TRAINING',  'ລາ ເຂົ້າ ຝຶກ ອົບ ຮົມ',          'Training Leave',   NULL, true,  true,  NULL)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════
-- 2. leave_requests — ໃບ ຂໍ ລາ ພັກ
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    leave_type_id INTEGER REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(5,1) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    reject_reason TEXT,
    attachment_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ═══════════════════════════════════════
-- 3. leave_balances — ຍອດ ລາ ພັກ ຄົງ ເຫຼືອ
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    leave_type_id INTEGER REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    entitled_days NUMERIC(5,1) NOT NULL,
    used_days NUMERIC(5,1) DEFAULT 0,
    carried_over NUMERIC(5,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

-- ═══════════════════════════════════════
-- 4. overtime_records — ລາຍ ລະ ອຽດ OT
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS overtime_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours NUMERIC(4,1) NOT NULL,
    ot_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    rate_multiplier NUMERIC(3,2) DEFAULT 1.50,
    amount NUMERIC(15,2),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_overtime_employee ON overtime_records(employee_id);

-- ═══════════════════════════════════════
-- 5. allowance_types — ປະ ເພດ ເງິນ ອຸດ ໜຸນ
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS allowance_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name_la VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    default_amount NUMERIC(15,2) DEFAULT 0,
    is_taxable BOOLEAN DEFAULT true,
    applies_to VARCHAR(20) DEFAULT 'ALL',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

INSERT INTO allowance_types (code, name_la, name_en, default_amount, is_taxable, applies_to) VALUES
('HOUSING',       'ຄ່າ ເຊົ່າ ເຮືອນ',        'Housing Allowance',       500000,  false, 'ALL'),
('TRANSPORT',     'ຄ່າ ພາ ຫະ ນະ',           'Transport Allowance',     300000,  false, 'ALL'),
('MEAL',          'ຄ່າ ອາ ຫານ',             'Meal Allowance',          500000,  false, 'ALL'),
('PHONE',         'ຄ່າ ໂທ ລະ ສັບ',           'Phone Allowance',         200000,  false, 'ALL'),
('POSITION',      'ເງິນ ຕຳ ແໜ່ງ',           'Position Allowance',      0,       true,  'ALL'),
('HARDSHIP',      'ເງິນ ຫ່າງ ໄກ ສອກ ຫຼີກ',  'Hardship Allowance',      0,       false, 'ALL'),
('FAMILY',        'ເງິນ ອຸດ ໜຸນ ຄອບ ຄົວ',    'Family Allowance',        0,       false, 'ALL'),
('SENIORITY',     'ເງິນ ອາ ວຸ ໂສ',           'Seniority Allowance',     0,       true,  'ALL'),
('CIVIL_GRADE',   'ເງິນ ຂັ້ນ ລັດ ຖະ ກອນ',    'Civil Grade Allowance',   0,       true,  'CIVIL_SERVANT'),
('PROFESSIONAL',  'ເງິນ ວິ ຊາ ຊີບ',           'Professional Allowance',  0,       true,  'ALL'),
('PERFORMANCE',   'ເງິນ ຜົນ ງານ',            'Performance Bonus',       0,       true,  'ALL'),
('FUEL',          'ຄ່າ ນ້ຳ ມັນ',              'Fuel Allowance',          0,       false, 'ALL')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════
-- 6. salary_grades — ຂັ້ນ ເງິນ ເດືອນ
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS salary_grades (
    id SERIAL PRIMARY KEY,
    grade_code VARCHAR(10) NOT NULL,
    step INTEGER DEFAULT 1,
    base_salary NUMERIC(15,2) NOT NULL,
    description VARCHAR(200),
    employee_type VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grade_code, step, employee_type)
);

-- ── ພາກ ເອ ກະ ຊົນ (Private) ──
INSERT INTO salary_grades (grade_code, step, base_salary, description, employee_type) VALUES
('P1', 1,  3000000, 'ພະ ນັກ ງານ ທົ່ວ ໄປ ຂັ້ນ 1',           'PRIVATE'),
('P1', 2,  3500000, 'ພະ ນັກ ງານ ທົ່ວ ໄປ ຂັ້ນ 2',           'PRIVATE'),
('P1', 3,  4000000, 'ພະ ນັກ ງານ ທົ່ວ ໄປ ຂັ້ນ 3',           'PRIVATE'),
('P2', 1,  5000000, 'ຫົວ ໜ້າ ທີມ ຂັ້ນ 1',                   'PRIVATE'),
('P2', 2,  6000000, 'ຫົວ ໜ້າ ທີມ ຂັ້ນ 2',                   'PRIVATE'),
('P2', 3,  7000000, 'ຫົວ ໜ້າ ທີມ ຂັ້ນ 3',                   'PRIVATE'),
('P3', 1,  8000000, 'ຫົວ ໜ້າ ພະ ແນກ ຂັ້ນ 1',               'PRIVATE'),
('P3', 2, 10000000, 'ຫົວ ໜ້າ ພະ ແນກ ຂັ້ນ 2',               'PRIVATE'),
('P3', 3, 12000000, 'ຫົວ ໜ້າ ພະ ແນກ ຂັ້ນ 3',               'PRIVATE'),
('P4', 1, 15000000, 'ຜູ້ ອຳ ນວຍ ການ / ຮອງ ຂັ້ນ 1',         'PRIVATE'),
('P4', 2, 18000000, 'ຜູ້ ອຳ ນວຍ ການ / ຮອງ ຂັ້ນ 2',         'PRIVATE'),
('P5', 1, 25000000, 'ຜູ້ ອຳ ນວຍ ການ ໃຫຍ່',                  'PRIVATE')
ON CONFLICT (grade_code, step, employee_type) DO NOTHING;

-- ── ລັດ ຖະ ກອນ (Civil Servant) — ອ້າງ ອີງ ດຳ ລັດ 255 ──
INSERT INTO salary_grades (grade_code, step, base_salary, description, employee_type) VALUES
('C1', 1,  1800000, 'ລັດ ຖະ ກອນ ຊັ້ນ 1 ຂັ້ນ 1 (ປະ ຖົມ)',     'CIVIL_SERVANT'),
('C1', 2,  1900000, 'ລັດ ຖະ ກອນ ຊັ້ນ 1 ຂັ້ນ 2',              'CIVIL_SERVANT'),
('C1', 3,  2000000, 'ລັດ ຖະ ກອນ ຊັ້ນ 1 ຂັ້ນ 3',              'CIVIL_SERVANT'),
('C2', 1,  2200000, 'ລັດ ຖະ ກອນ ຊັ້ນ 2 ຂັ້ນ 1 (ມ ປາຍ)',     'CIVIL_SERVANT'),
('C2', 2,  2400000, 'ລັດ ຖະ ກອນ ຊັ້ນ 2 ຂັ້ນ 2',              'CIVIL_SERVANT'),
('C2', 3,  2600000, 'ລັດ ຖະ ກອນ ຊັ້ນ 2 ຂັ້ນ 3',              'CIVIL_SERVANT'),
('C3', 1,  2800000, 'ລັດ ຖະ ກອນ ຊັ້ນ 3 ຂັ້ນ 1 (ປ ຕີ)',      'CIVIL_SERVANT'),
('C3', 2,  3100000, 'ລັດ ຖະ ກອນ ຊັ້ນ 3 ຂັ້ນ 2',              'CIVIL_SERVANT'),
('C3', 3,  3400000, 'ລັດ ຖະ ກອນ ຊັ້ນ 3 ຂັ້ນ 3',              'CIVIL_SERVANT'),
('C4', 1,  3700000, 'ລັດ ຖະ ກອນ ຊັ້ນ 4 ຂັ້ນ 1 (ປ ໂທ)',      'CIVIL_SERVANT'),
('C4', 2,  4000000, 'ລັດ ຖະ ກອນ ຊັ້ນ 4 ຂັ້ນ 2',              'CIVIL_SERVANT'),
('C5', 1,  4500000, 'ລັດ ຖະ ກອນ ຊັ້ນ 5 ຂັ້ນ 1 (ປ ເອກ)',     'CIVIL_SERVANT'),
('C5', 2,  5000000, 'ລັດ ຖະ ກອນ ຊັ້ນ 5 ຂັ້ນ 2',              'CIVIL_SERVANT')
ON CONFLICT (grade_code, step, employee_type) DO NOTHING;

-- ═══════════════════════════════════════
-- 7. tax_brackets — ຂັ້ນ ອາ ກອນ (configurable)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS tax_brackets (
    id SERIAL PRIMARY KEY,
    min_income NUMERIC(15,2) NOT NULL,
    max_income NUMERIC(15,2),
    rate NUMERIC(5,4) NOT NULL,
    effective_date DATE NOT NULL DEFAULT '2019-01-01',
    description VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tax_brackets (min_income, max_income, rate, description, effective_date) VALUES
(       0,  1300000, 0.0000, 'ຍົກ ເວັ້ນ (0%)',           '2019-01-01'),
( 1300001,  5000000, 0.0500, 'ຂັ້ນ 2 (5%)',              '2019-01-01'),
( 5000001, 15000000, 0.1000, 'ຂັ້ນ 3 (10%)',             '2019-01-01'),
(15000001, 25000000, 0.1500, 'ຂັ້ນ 4 (15%)',             '2019-01-01'),
(25000001, 45000000, 0.2000, 'ຂັ້ນ 5 (20%)',             '2019-01-01'),
(45000001,     NULL, 0.2500, 'ຂັ້ນ 6 (25%)',             '2019-01-01')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════
-- 8. payroll_details — ລາຍ ລະ ອຽດ ເງິນ ເດືອນ
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS payroll_details (
    id SERIAL PRIMARY KEY,
    payroll_id INTEGER REFERENCES payrolls(id),
    item_type VARCHAR(20) NOT NULL,
    item_code VARCHAR(30) NOT NULL,
    item_name VARCHAR(100),
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_details_payroll ON payroll_details(payroll_id);

-- ═══════════════════════════════════════
-- 9. ເພີ່ມ columns ໃນ employees ສຳ ລັບ ລາ ອອກ
-- ═══════════════════════════════════════
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resignation_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resignation_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_working_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_info_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_grade_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INTEGER;

-- ═══════════════════════════════════════
-- 10. employee_allowances — ເງິນ ອຸດ ໜຸນ ແຕ່ ລະ ຄົນ
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS employee_allowances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    allowance_type_id INTEGER REFERENCES allowance_types(id),
    amount NUMERIC(15,2) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(employee_id, allowance_type_id, effective_date)
);

-- ═══════════════════════════════════════
-- 11. Views ສຳ ລັບ auto CRUD
-- ═══════════════════════════════════════

-- View: leave_requests with employee name + leave type
CREATE OR REPLACE VIEW v_leave_requests AS
SELECT lr.*,
       lt.code as leave_type_code,
       lt.name_la as leave_type_name,
       e.employee_code
FROM leave_requests lr
LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
LEFT JOIN employees e ON e.id = lr.employee_id
WHERE lr.deleted_at IS NULL;

-- View: overtime with employee
CREATE OR REPLACE VIEW v_overtime_records AS
SELECT ot.*,
       e.employee_code
FROM overtime_records ot
LEFT JOIN employees e ON e.id = ot.employee_id
WHERE ot.deleted_at IS NULL;

-- View: leave balances with details
CREATE OR REPLACE VIEW v_leave_balances AS
SELECT lb.*,
       lt.code as leave_type_code,
       lt.name_la as leave_type_name,
       e.employee_code,
       (lb.entitled_days + lb.carried_over - lb.used_days) as remaining_days
FROM leave_balances lb
LEFT JOIN leave_types lt ON lt.id = lb.leave_type_id
LEFT JOIN employees e ON e.id = lb.employee_id;

-- View: employee allowances
CREATE OR REPLACE VIEW v_employee_allowances AS
SELECT ea.*,
       at.code as allowance_code,
       at.name_la as allowance_name,
       e.employee_code
FROM employee_allowances ea
LEFT JOIN allowance_types at ON at.id = ea.allowance_type_id
LEFT JOIN employees e ON e.id = ea.employee_id
WHERE ea.deleted_at IS NULL;

COMMIT;
