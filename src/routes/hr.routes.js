/**
 * hr.routes.js — HR System Routes
 * 
 * ── ການ ລາ ພັກ ──
 * POST   /hr/leave-request           — ຂໍ ລາ ພັກ
 * PUT    /hr/leave-request/:id/approve — ອະ ນຸ ມັດ
 * PUT    /hr/leave-request/:id/reject  — ປະ ຕິ ເສດ
 * GET    /hr/leave-balance/:employeeId — ຍອດ ລາ ພັກ
 * POST   /hr/leave-balance/init        — ຕັ້ງ ຍອດ ເລີ່ມ ຕົ້ນ ທຸກ ຄົນ
 * 
 * ── OT ──
 * POST   /hr/overtime                 — ບັນ ທຶກ OT
 * PUT    /hr/overtime/:id/approve     — ອະ ນຸ ມັດ OT
 * 
 * ── ເງິນ ເດືອນ ──
 * POST   /hr/payroll/calculate        — ຄິດ ໄລ່ ເງິນ ເດືອນ (batch)
 * GET    /hr/payroll/slip/:payrollId  — ສະ ລິບ
 * POST   /hr/payroll/finalize         — ຢືນ ຢັນ ການ ຈ່າຍ
 * 
 * ── ລາ ອອກ ──
 * PUT    /hr/employee/:id/resign      — ບັນ ທຶກ ການ ລາ ອອກ
 * GET    /hr/employee/:id/certificate — ໃບ ຢັ້ງ ຢືນ ການ ເຮັດ ວຽກ
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;
const { requirePermission } = require('../middleware/rbac');

// ═══════════════════════════════════════════════════════
// Tax Calculation — ຄິດ ໄລ່ ອາ ກອນ ຕາມ ຂັ້ນ
// ═══════════════════════════════════════════════════════
async function calculateTax(taxableIncome) {
    const [brackets] = await sequelize.query(`
        SELECT min_income, max_income, rate
        FROM tax_brackets
        WHERE is_active = true
        ORDER BY min_income ASC
    `);

    let totalTax = 0;
    let remaining = taxableIncome;

    for (const bracket of brackets) {
        const min = parseFloat(bracket.min_income);
        const max = bracket.max_income ? parseFloat(bracket.max_income) : Infinity;
        const rate = parseFloat(bracket.rate);

        if (remaining <= 0) break;

        const taxableInBracket = Math.min(remaining, max - min);
        if (taxableInBracket > 0) {
            totalTax += taxableInBracket * rate;
            remaining -= taxableInBracket;
        }
    }

    return Math.round(totalTax);
}

// ═══════════════════════════════════════════════════════
// POST /hr/leave-request — ຂໍ ລາ ພັກ
// ═══════════════════════════════════════════════════════
router.post('/hr/leave-request', async (req, res) => {
    try {
        const { employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment_url } = req.body;

        if (!employee_id || !leave_type_id || !start_date || !end_date || !total_days) {
            return res.status(400).json({ status: false, message: 'ກະ ລຸ ນາ ປ້ອນ ຂໍ້ ມູນ ໃຫ້ ຄົບ' });
        }

        // Check leave balance
        const year = new Date(start_date).getFullYear();
        const [balances] = await sequelize.query(`
            SELECT entitled_days + carried_over - used_days as remaining
            FROM leave_balances
            WHERE employee_id = :eid AND leave_type_id = :ltid AND year = :year
        `, { replacements: { eid: employee_id, ltid: leave_type_id, year } });

        if (balances.length > 0) {
            const remaining = parseFloat(balances[0].remaining);
            if (total_days > remaining) {
                return res.status(400).json({
                    status: false,
                    message: `ວັນ ລາ ບໍ່ ພຽງ ພໍ. ຄົງ ເຫຼືອ ${remaining} ວັນ, ຂໍ ${total_days} ວັນ`
                });
            }
        }

        const [result] = await sequelize.query(`
            INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment_url, status)
            VALUES (:eid, :ltid, :start, :end, :days, :reason, :attach, 'PENDING')
            RETURNING id
        `, {
            replacements: {
                eid: employee_id, ltid: leave_type_id,
                start: start_date, end: end_date,
                days: total_days, reason: reason || '',
                attach: attachment_url || null,
            }
        });

        res.json({ status: true, message: 'ສົ່ງ ໃບ ຂໍ ລາ ສຳ ເລັດ — ລໍ ຖ້າ ອະ ນຸ ມັດ', data: { id: result[0].id } });
    } catch (err) {
        console.error('Leave request error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// PUT /hr/leave-request/:id/approve — ອະ ນຸ ມັດ ລາ ພັກ
// ═══════════════════════════════════════════════════════
router.put('/hr/leave-request/:id/approve', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const id = req.params.id;

        // Get leave request
        const [reqs] = await sequelize.query(
            `SELECT * FROM leave_requests WHERE id = :id AND status = 'PENDING'`,
            { replacements: { id }, transaction: t }
        );
        if (!reqs.length) {
            await t.rollback();
            return res.status(404).json({ status: false, message: 'ບໍ່ ພົບ ໃບ ຂໍ ລາ ຫຼື ອະ ນຸ ມັດ ແລ້ວ' });
        }
        const lr = reqs[0];

        // Update status
        await sequelize.query(`
            UPDATE leave_requests SET status = 'APPROVED', approved_by = :approver, approved_at = NOW(), updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id, approver: req.user?.id || null }, transaction: t });

        // Deduct from balance
        const year = new Date(lr.start_date).getFullYear();
        await sequelize.query(`
            UPDATE leave_balances SET used_days = used_days + :days, updated_at = NOW()
            WHERE employee_id = :eid AND leave_type_id = :ltid AND year = :year
        `, { replacements: { eid: lr.employee_id, ltid: lr.leave_type_id, days: lr.total_days, year }, transaction: t });

        await t.commit();
        res.json({ status: true, message: 'ອະ ນຸ ມັດ ລາ ພັກ ສຳ ເລັດ' });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// PUT /hr/leave-request/:id/reject — ປະ ຕິ ເສດ
// ═══════════════════════════════════════════════════════
router.put('/hr/leave-request/:id/reject', async (req, res) => {
    try {
        const { reject_reason } = req.body;
        await sequelize.query(`
            UPDATE leave_requests SET status = 'REJECTED', reject_reason = :reason, approved_by = :approver, approved_at = NOW(), updated_at = NOW()
            WHERE id = :id AND status = 'PENDING'
        `, { replacements: { id: req.params.id, reason: reject_reason || '', approver: req.user?.id || null } });

        res.json({ status: true, message: 'ປະ ຕິ ເສດ ໃບ ລາ ສຳ ເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// GET /hr/leave-balance/:employeeId — ຍອດ ລາ ພັກ
// ═══════════════════════════════════════════════════════
router.get('/hr/leave-balance/:employeeId', async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const [rows] = await sequelize.query(`
            SELECT lb.*, lt.code, lt.name_la,
                   (lb.entitled_days + lb.carried_over - lb.used_days) as remaining_days
            FROM leave_balances lb
            JOIN leave_types lt ON lt.id = lb.leave_type_id
            WHERE lb.employee_id = :eid AND lb.year = :year
            ORDER BY lt.id
        `, { replacements: { eid: req.params.employeeId, year } });

        res.json({ status: true, data: rows });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /hr/leave-balance/init — ຕັ້ງ ຍອດ ເລີ່ມ ຕົ້ນ ປະ ຈຳ ປີ
// ═══════════════════════════════════════════════════════
router.post('/hr/leave-balance/init', async (req, res) => {
    try {
        const year = req.body.year || new Date().getFullYear();

        // Get all active employees
        const [employees] = await sequelize.query(
            `SELECT id FROM employees WHERE status = 'ACTIVE' AND deleted_at IS NULL`
        );
        // Get leave types with limits
        const [leaveTypes] = await sequelize.query(
            `SELECT id, max_days_per_year FROM leave_types WHERE is_active = true AND max_days_per_year IS NOT NULL`
        );

        let inserted = 0;
        for (const emp of employees) {
            for (const lt of leaveTypes) {
                await sequelize.query(`
                    INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over)
                    VALUES (:eid, :ltid, :year, :days, 0, 0)
                    ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING
                `, { replacements: { eid: emp.id, ltid: lt.id, year, days: lt.max_days_per_year } });
                inserted++;
            }
        }

        res.json({ status: true, message: `ຕັ້ງ ຍອດ ລາ ພັກ ປີ ${year} ສຳ ເລັດ`, data: { employees: employees.length, types: leaveTypes.length, records: inserted } });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /hr/overtime — ບັນ ທຶກ OT
// ═══════════════════════════════════════════════════════
router.post('/hr/overtime', async (req, res) => {
    try {
        const { employee_id, work_date, start_time, end_time, hours, ot_type, reason } = req.body;

        // Determine rate multiplier
        const rates = { NORMAL: 1.50, HOLIDAY: 2.00, NATIONAL: 3.00, NIGHT: 1.65 };
        const rate = rates[ot_type] || 1.50;

        // Get employee hourly rate from contract
        const [contracts] = await sequelize.query(`
            SELECT salary, working_hours FROM employment_contracts
            WHERE employee_id = :eid ORDER BY start_date DESC LIMIT 1
        `, { replacements: { eid: employee_id } });

        let amount = 0;
        if (contracts.length) {
            const monthlySalary = parseFloat(contracts[0].salary);
            const monthlyHours = (contracts[0].working_hours || 8) * 26; // 26 working days
            const hourlyRate = monthlySalary / monthlyHours;
            amount = Math.round(hourlyRate * hours * rate);
        }

        const [result] = await sequelize.query(`
            INSERT INTO overtime_records (employee_id, work_date, start_time, end_time, hours, ot_type, rate_multiplier, amount, reason, status)
            VALUES (:eid, :date, :start, :end, :hours, :type, :rate, :amount, :reason, 'PENDING')
            RETURNING id
        `, {
            replacements: {
                eid: employee_id, date: work_date, start: start_time, end: end_time,
                hours, type: ot_type || 'NORMAL', rate, amount, reason: reason || ''
            }
        });

        res.json({ status: true, message: `ບັນ ທຶກ OT ສຳ ເລັດ — ${hours} ຊມ × ${rate} = ${amount.toLocaleString()} LAK`, data: { id: result[0].id, amount } });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// PUT /hr/overtime/:id/approve — ອະ ນຸ ມັດ OT
// ═══════════════════════════════════════════════════════
router.put('/hr/overtime/:id/approve', async (req, res) => {
    try {
        await sequelize.query(`
            UPDATE overtime_records SET status = 'APPROVED', approved_by = :approver, approved_at = NOW(), updated_at = NOW()
            WHERE id = :id AND status = 'PENDING'
        `, { replacements: { id: req.params.id, approver: req.user?.id || null } });

        res.json({ status: true, message: 'ອະ ນຸ ມັດ OT ສຳ ເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /hr/payroll/calculate — ຄິດ ໄລ່ ເງິນ ເດືອນ (batch)
// ═══════════════════════════════════════════════════════
router.post('/hr/payroll/calculate', async (req, res) => {
    try {
        const { payroll_month, employee_ids } = req.body;  // payroll_month: '2026-03-01'

        if (!payroll_month) {
            return res.status(400).json({ status: false, message: 'ກະ ລຸ ນາ ລະ ບຸ ເດືອນ' });
        }

        // Get employees to process
        let empFilter = '';
        if (employee_ids && employee_ids.length) {
            empFilter = `AND e.id IN (${employee_ids.map(Number).join(',')})`;
        }

        const [employees] = await sequelize.query(`
            SELECT e.id, e.employee_code, e.status,
                   ec.salary as base_salary, ec.working_hours
            FROM employees e
            LEFT JOIN employment_contracts ec ON ec.employee_id = e.id AND ec.deleted_at IS NULL
            WHERE e.status = 'ACTIVE' AND e.deleted_at IS NULL ${empFilter}
            ORDER BY e.id
        `);

        const month = payroll_month.slice(0, 7); // '2026-03'
        const results = [];
        const SSO_RATE = 0.055; // 5.5% employee share

        for (const emp of employees) {
            const baseSalary = parseFloat(emp.base_salary || 0);

            // 1. Get allowances
            const [allowances] = await sequelize.query(`
                SELECT ea.amount, at.code, at.name_la, at.is_taxable
                FROM employee_allowances ea
                JOIN allowance_types at ON at.id = ea.allowance_type_id
                WHERE ea.employee_id = :eid AND ea.is_active = true AND ea.deleted_at IS NULL
            `, { replacements: { eid: emp.id } });

            let totalAllowance = 0;
            let taxableAllowance = 0;
            const allowanceDetails = [];
            for (const a of allowances) {
                const amt = parseFloat(a.amount);
                totalAllowance += amt;
                if (a.is_taxable) taxableAllowance += amt;
                allowanceDetails.push({ code: a.code, name: a.name_la, amount: amt });
            }

            // 2. Get approved OT for this month
            const [otRecords] = await sequelize.query(`
                SELECT COALESCE(SUM(amount), 0) as total_ot
                FROM overtime_records
                WHERE employee_id = :eid AND status = 'APPROVED'
                AND TO_CHAR(work_date, 'YYYY-MM') = :month
            `, { replacements: { eid: emp.id, month } });
            const totalOT = parseFloat(otRecords[0]?.total_ot || 0);

            // 3. Calculate
            const grossIncome = baseSalary + totalAllowance + totalOT;
            const socialSecurity = Math.round(baseSalary * SSO_RATE);
            const taxableIncome = baseSalary + taxableAllowance + totalOT - socialSecurity;
            const tax = await calculateTax(Math.max(0, taxableIncome));
            const netSalary = grossIncome - socialSecurity - tax;

            // 4. Insert or update payroll
            const [existing] = await sequelize.query(
                `SELECT id FROM payrolls WHERE employee_id = :eid AND payroll_month = :month AND deleted_at IS NULL`,
                { replacements: { eid: emp.id, month: payroll_month } }
            );

            let payrollId;
            if (existing.length) {
                payrollId = existing[0].id;
                await sequelize.query(`
                    UPDATE payrolls SET basic_salary = :basic, allowance = :allow, ot = :ot,
                        deduction = 0, social_security = :sso, tax = :tax, net_salary = :net,
                        updated_at = NOW()
                    WHERE id = :id
                `, {
                    replacements: {
                        id: payrollId, basic: baseSalary, allow: totalAllowance,
                        ot: totalOT, sso: socialSecurity, tax, net: netSalary
                    }
                });
                // Clear old details
                await sequelize.query(`DELETE FROM payroll_details WHERE payroll_id = :pid`, { replacements: { pid: payrollId } });
            } else {
                const [ins] = await sequelize.query(`
                    INSERT INTO payrolls (employee_id, payroll_month, basic_salary, allowance, ot, bonus, deduction, social_security, tax, net_salary, pay_date)
                    VALUES (:eid, :month, :basic, :allow, :ot, 0, 0, :sso, :tax, :net, NULL)
                    RETURNING id
                `, {
                    replacements: {
                        eid: emp.id, month: payroll_month, basic: baseSalary,
                        allow: totalAllowance, ot: totalOT, sso: socialSecurity,
                        tax, net: netSalary
                    }
                });
                payrollId = ins[0].id;
            }

            // 5. Insert payroll details
            const details = [
                { type: 'EARNING', code: 'BASIC', name: 'ເງິນ ເດືອນ ພື້ນ ຖານ', amount: baseSalary },
                ...allowanceDetails.map(a => ({ type: 'EARNING', code: a.code, name: a.name, amount: a.amount })),
            ];
            if (totalOT > 0) details.push({ type: 'EARNING', code: 'OT', name: 'ເງິນ ລ່ວງ ເວ ລາ', amount: totalOT });
            details.push({ type: 'DEDUCTION', code: 'SSO', name: 'ປະ ກັນ ສັງ ຄົມ (5.5%)', amount: socialSecurity });
            details.push({ type: 'DEDUCTION', code: 'TAX', name: 'ອາ ກອນ ເງິນ ເດືອນ', amount: tax });

            for (const d of details) {
                await sequelize.query(`
                    INSERT INTO payroll_details (payroll_id, item_type, item_code, item_name, amount)
                    VALUES (:pid, :type, :code, :name, :amount)
                `, { replacements: { pid: payrollId, type: d.type, code: d.code, name: d.name, amount: d.amount } });
            }

            results.push({
                employee_id: emp.id,
                employee_code: emp.employee_code,
                payroll_id: payrollId,
                basic_salary: baseSalary,
                allowance: totalAllowance,
                ot: totalOT,
                social_security: socialSecurity,
                tax,
                net_salary: netSalary,
            });
        }

        res.json({
            status: true,
            message: `ຄິດ ໄລ່ ເງິນ ເດືອນ ເດືອນ ${month} ສຳ ເລັດ — ${results.length} ພະ ນັກ ງານ`,
            data: { month, count: results.length, payrolls: results }
        });
    } catch (err) {
        console.error('Payroll calculate error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// GET /hr/payroll/slip/:payrollId — ສະ ລິບ ເງິນ ເດືອນ
// ═══════════════════════════════════════════════════════
router.get('/hr/payroll/slip/:payrollId', async (req, res) => {
    try {
        const [payrolls] = await sequelize.query(`
            SELECT p.*, e.employee_code,
                   pi.firstname__la, pi.lastname__la
            FROM payrolls p
            JOIN employees e ON e.id = p.employee_id
            LEFT JOIN personal_info pi ON pi.id = e.personal_info_id
            WHERE p.id = :pid
        `, { replacements: { pid: req.params.payrollId } });

        if (!payrolls.length) return res.status(404).json({ status: false, message: 'ບໍ່ ພົບ' });

        const [details] = await sequelize.query(`
            SELECT * FROM payroll_details WHERE payroll_id = :pid ORDER BY item_type, id
        `, { replacements: { pid: req.params.payrollId } });

        const earnings = details.filter(d => d.item_type === 'EARNING');
        const deductions = details.filter(d => d.item_type === 'DEDUCTION');

        res.json({
            status: true,
            data: {
                payroll: payrolls[0],
                earnings,
                deductions,
                totalEarnings: earnings.reduce((s, e) => s + parseFloat(e.amount), 0),
                totalDeductions: deductions.reduce((s, d) => s + parseFloat(d.amount), 0),
            }
        });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /hr/payroll/finalize — ຢືນ ຢັນ ການ ຈ່າຍ
// ═══════════════════════════════════════════════════════
router.post('/hr/payroll/finalize', async (req, res) => {
    try {
        const { payroll_month, pay_date } = req.body;
        const [result] = await sequelize.query(`
            UPDATE payrolls SET pay_date = :pay_date, updated_at = NOW()
            WHERE payroll_month = :month AND pay_date IS NULL AND deleted_at IS NULL
            RETURNING id
        `, { replacements: { month: payroll_month, pay_date: pay_date || new Date().toISOString().split('T')[0] } });

        res.json({ status: true, message: `ຢືນ ຢັນ ການ ຈ່າຍ ສຳ ເລັດ — ${result.length} ລາຍ ການ`, data: { finalized: result.length } });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// PUT /hr/employee/:id/resign — ບັນ ທຶກ ການ ລາ ອອກ
// ═══════════════════════════════════════════════════════
router.put('/hr/employee/:id/resign', async (req, res) => {
    try {
        const { resignation_date, resignation_reason, last_working_date } = req.body;

        await sequelize.query(`
            UPDATE employees SET
                status = 'RESIGNED',
                resignation_date = :res_date,
                resignation_reason = :reason,
                last_working_date = :last_date,
                updated_at = NOW()
            WHERE id = :id
        `, {
            replacements: {
                id: req.params.id,
                res_date: resignation_date || new Date().toISOString().split('T')[0],
                reason: resignation_reason || '',
                last_date: last_working_date || resignation_date || new Date().toISOString().split('T')[0],
            }
        });

        res.json({ status: true, message: 'ບັນ ທຶກ ການ ລາ ອອກ ສຳ ເລັດ' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// GET /hr/employee/:id/certificate — ຂໍ້ ມູນ ໃບ ຢັ້ງ ຢືນ
// ═══════════════════════════════════════════════════════
router.get('/hr/employee/:id/certificate', async (req, res) => {
    try {
        const empId = parseInt(req.params.id);

        // 1. Get employee base data  
        const [emps] = await sequelize.query(
            `SELECT * FROM employees WHERE id = :id LIMIT 1`,
            { replacements: { id: empId } }
        );
        if (!emps.length) return res.status(404).json({ status: false, message: 'ບໍ່ ພົບ ພະ ນັກ ງານ' });
        const e = emps[0];

        // 2. Get personal info
        let pi = {};
        if (e.personal_info_id) {
            try {
                const [rows] = await sequelize.query(
                    `SELECT firstname__la, lastname__la, dateofbirth, gender_id FROM personal_info WHERE id = :id`,
                    { replacements: { id: parseInt(e.personal_info_id) } }
                );
                if (rows.length) pi = rows[0];
            } catch (err) { /* skip */ }
        }

        // 3. Get department
        let dept = {};
        if (e.department_id) {
            try {
                const [rows] = await sequelize.query(
                    `SELECT name as department_name FROM departments WHERE id = :id`,
                    { replacements: { id: parseInt(e.department_id) } }
                );
                if (rows.length) dept = rows[0];
            } catch (err) { /* skip */ }
        }

        // 4. Get latest contract
        let contract = {};
        try {
            const [rows] = await sequelize.query(
                `SELECT contract_type, salary, start_date as contract_start FROM employment_contracts WHERE employee_id = :id AND deleted_at IS NULL ORDER BY start_date DESC LIMIT 1`,
                { replacements: { id: empId } }
            );
            if (rows.length) contract = rows[0];
        } catch (err) { /* skip */ }

        // 5. Get MFI info
        let mfi = {};
        try {
            const [rows] = await sequelize.query(`SELECT name_la as mfi_name, license_no FROM mfi_info LIMIT 1`);
            if (rows.length) mfi = rows[0];
        } catch (err) { /* skip */ }

        // 6. Get position
        let position = {};
        try {
            const [rows] = await sequelize.query(
                `SELECT ep.position_name FROM employee_assignments ea JOIN employee_positions ep ON ep.id = CAST(ea.position_id AS INTEGER) WHERE ea.employee_id = :id ORDER BY ea.id DESC LIMIT 1`,
                { replacements: { id: empId } }
            );
            if (rows.length) position = rows[0];
        } catch (err) { /* skip */ }

        res.json({
            status: true,
            data: {
                id: e.id, employee_code: e.employee_code, hire_date: e.hire_date, status: e.status,
                resignation_date: e.resignation_date, resignation_reason: e.resignation_reason,
                last_working_date: e.last_working_date,
                ...pi, ...dept, ...contract, ...mfi, ...position,
            }
        });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// GET /hr/dashboard — ພາບ ລວມ HR
// ═══════════════════════════════════════════════════════
router.get('/hr/dashboard', async (_req, res) => {
    try {
        const [stats] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE' AND deleted_at IS NULL) as active_employees,
                (SELECT COUNT(*) FROM employees WHERE status = 'RESIGNED' AND deleted_at IS NULL) as resigned,
                (SELECT COUNT(*) FROM leave_requests WHERE status = 'PENDING') as pending_leaves,
                (SELECT COUNT(*) FROM overtime_records WHERE status = 'PENDING') as pending_ot,
                (SELECT COUNT(*) FROM leave_requests WHERE status = 'APPROVED' AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NOW())) as leaves_this_month
        `);

        res.json({ status: true, data: stats[0] });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// GET /hr/payroll/report — ລາຍ ງານ ເງິນ ເດືອນ ລວມ
// ═══════════════════════════════════════════════════════
router.get('/hr/payroll/report', async (req, res) => {
    try {
        const month = req.query.month; // '2026-03-01'
        if (!month) return res.status(400).json({ status: false, message: 'ກະ ລຸ ນາ ລະ ບຸ ເດືອນ' });

        const [rows] = await sequelize.query(`
            SELECT p.id, p.employee_id, p.payroll_month,
                   p.basic_salary, p.allowance, p.ot, p.bonus,
                   p.deduction, p.social_security, p.tax, p.net_salary, p.pay_date,
                   e.employee_code,
                   pi.firstname__la, pi.lastname__la
            FROM payrolls p
            JOIN employees e ON e.id = p.employee_id
            LEFT JOIN personal_info pi ON pi.id::text = e.personal_info_id::text
            WHERE p.payroll_month = :month AND p.deleted_at IS NULL
            AND p.basic_salary > 0
            ORDER BY e.employee_code, e.id
        `, { replacements: { month } });

        // Totals
        const totals = {
            count: rows.length,
            basic_salary: 0, allowance: 0, ot: 0, bonus: 0,
            social_security: 0, tax: 0, deduction: 0, net_salary: 0,
        };
        for (const r of rows) {
            totals.basic_salary += parseFloat(r.basic_salary || 0);
            totals.allowance += parseFloat(r.allowance || 0);
            totals.ot += parseFloat(r.ot || 0);
            totals.bonus += parseFloat(r.bonus || 0);
            totals.social_security += parseFloat(r.social_security || 0);
            totals.tax += parseFloat(r.tax || 0);
            totals.deduction += parseFloat(r.deduction || 0);
            totals.net_salary += parseFloat(r.net_salary || 0);
        }

        // MFI info
        let mfi = {};
        try {
            const [mi] = await sequelize.query(`SELECT name_la as mfi_name, license_no FROM mfi_info LIMIT 1`);
            if (mi.length) mfi = mi[0];
        } catch (e) { /* skip */ }

        res.json({
            status: true,
            data: { month, employees: rows, totals, mfi }
        });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;
