/**
 * hr.service.js — HR Business Logic (13 endpoints)
 * ═══════════════════════════════════════════════════
 * Leave: request, approve, reject, balance, initBalance
 * OT: record, approve
 * Payroll: calculate (batch), slip, finalize, report
 * Employee: resign, certificate, dashboard
 */
const db = require('../models');
const sequelize = db.sequelize;

// ── Tax Calculation (Lao PDR brackets) ──
async function calculateTax(taxableIncome) {
    const [brackets] = await sequelize.query(`SELECT min_income, max_income, rate FROM tax_brackets WHERE is_active = true ORDER BY min_income ASC`);
    let totalTax = 0, remaining = taxableIncome;
    for (const b of brackets) {
        if (remaining <= 0) break;
        const min = parseFloat(b.min_income);
        const max = b.max_income ? parseFloat(b.max_income) : Infinity;
        const taxable = Math.min(remaining, max - min);
        if (taxable > 0) { totalTax += taxable * parseFloat(b.rate); remaining -= taxable; }
    }
    return Math.round(totalTax);
}

class HRService {
    // ── Leave ──
    static async leaveRequest({ employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment_url }) {
        if (!employee_id || !leave_type_id || !start_date || !end_date || !total_days) throw Object.assign(new Error('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ'), { status: 400 });
        const year = new Date(start_date).getFullYear();
        const [balances] = await sequelize.query(`SELECT entitled_days + carried_over - used_days as remaining FROM leave_balances WHERE employee_id = :eid AND leave_type_id = :ltid AND year = :year`, { replacements: { eid: employee_id, ltid: leave_type_id, year } });
        if (balances.length > 0 && total_days > parseFloat(balances[0].remaining)) throw Object.assign(new Error(`ວັນລາບໍ່ພຽງພໍ. ຄົງເຫຼືອ ${balances[0].remaining} ວັນ, ຂໍ ${total_days} ວັນ`), { status: 400 });
        const [result] = await sequelize.query(`INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment_url, status) VALUES (:eid, :ltid, :start, :end, :days, :reason, :attach, 'PENDING') RETURNING id`, { replacements: { eid: employee_id, ltid: leave_type_id, start: start_date, end: end_date, days: total_days, reason: reason || '', attach: attachment_url || null } });
        return { status: true, message: 'ສົ່ງໃບຂໍລາສຳເລັດ — ລໍຖ້າອະນຸມັດ', data: { id: result[0].id } };
    }

    static async leaveApprove(id, approverId) {
        const t = await sequelize.transaction();
        try {
            const [reqs] = await sequelize.query(`SELECT * FROM leave_requests WHERE id = :id AND status = 'PENDING'`, { replacements: { id }, transaction: t });
            if (!reqs.length) { await t.rollback(); throw Object.assign(new Error('ບໍ່ພົບໃບຂໍລາ ຫຼື ອະນຸມັດແລ້ວ'), { status: 404 }); }
            const lr = reqs[0];
            await sequelize.query(`UPDATE leave_requests SET status = 'APPROVED', approved_by = :approver, approved_at = NOW(), updated_at = NOW() WHERE id = :id`, { replacements: { id, approver: approverId }, transaction: t });
            const year = new Date(lr.start_date).getFullYear();
            await sequelize.query(`UPDATE leave_balances SET used_days = used_days + :days, updated_at = NOW() WHERE employee_id = :eid AND leave_type_id = :ltid AND year = :year`, { replacements: { eid: lr.employee_id, ltid: lr.leave_type_id, days: lr.total_days, year }, transaction: t });
            await t.commit();
            return { status: true, message: 'ອະນຸມັດລາພັກສຳເລັດ' };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async leaveReject(id, reject_reason, approverId) {
        await sequelize.query(`UPDATE leave_requests SET status = 'REJECTED', reject_reason = :reason, approved_by = :approver, approved_at = NOW(), updated_at = NOW() WHERE id = :id AND status = 'PENDING'`, { replacements: { id, reason: reject_reason || '', approver: approverId } });
        return { status: true, message: 'ປະຕິເສດໃບລາສຳເລັດ' };
    }

    static async leaveBalance(employeeId, year) {
        year = year || new Date().getFullYear();
        const [rows] = await sequelize.query(`SELECT lb.*, lt.code, lt.name_la, (lb.entitled_days + lb.carried_over - lb.used_days) as remaining_days FROM leave_balances lb JOIN leave_types lt ON lt.id = lb.leave_type_id WHERE lb.employee_id = :eid AND lb.year = :year ORDER BY lt.id`, { replacements: { eid: employeeId, year } });
        return { status: true, data: rows };
    }

    static async initLeaveBalance(year) {
        year = year || new Date().getFullYear();
        const [employees] = await sequelize.query(`SELECT id FROM employees WHERE status = 'ACTIVE' AND deleted_at IS NULL`);
        const [leaveTypes] = await sequelize.query(`SELECT id, max_days_per_year FROM leave_types WHERE is_active = true AND max_days_per_year IS NOT NULL`);
        let inserted = 0;
        for (const emp of employees) {
            for (const lt of leaveTypes) {
                await sequelize.query(`INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, carried_over) VALUES (:eid, :ltid, :year, :days, 0, 0) ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`, { replacements: { eid: emp.id, ltid: lt.id, year, days: lt.max_days_per_year } });
                inserted++;
            }
        }
        return { status: true, message: `ຕັ້ງຍອດລາພັກ ປີ ${year} ສຳເລັດ`, data: { employees: employees.length, types: leaveTypes.length, records: inserted } };
    }

    // ── OT ──
    static async overtimeRecord({ employee_id, work_date, start_time, end_time, hours, ot_type, reason }) {
        const rates = { NORMAL: 1.50, HOLIDAY: 2.00, NATIONAL: 3.00, NIGHT: 1.65 };
        const rate = rates[ot_type] || 1.50;
        const [contracts] = await sequelize.query(`SELECT salary, working_hours FROM employment_contracts WHERE employee_id = :eid ORDER BY start_date DESC LIMIT 1`, { replacements: { eid: employee_id } });
        let amount = 0;
        if (contracts.length) {
            const monthlyHours = (contracts[0].working_hours || 8) * 26;
            amount = Math.round(parseFloat(contracts[0].salary) / monthlyHours * hours * rate);
        }
        const [result] = await sequelize.query(`INSERT INTO overtime_records (employee_id, work_date, start_time, end_time, hours, ot_type, rate_multiplier, amount, reason, status) VALUES (:eid, :date, :start, :end, :hours, :type, :rate, :amount, :reason, 'PENDING') RETURNING id`, { replacements: { eid: employee_id, date: work_date, start: start_time, end: end_time, hours, type: ot_type || 'NORMAL', rate, amount, reason: reason || '' } });
        return { status: true, message: `ບັນທຶກ OT ສຳເລັດ — ${hours} ຊມ × ${rate} = ${amount.toLocaleString()} LAK`, data: { id: result[0].id, amount } };
    }

    static async overtimeApprove(id, approverId) {
        await sequelize.query(`UPDATE overtime_records SET status = 'APPROVED', approved_by = :approver, approved_at = NOW(), updated_at = NOW() WHERE id = :id AND status = 'PENDING'`, { replacements: { id, approver: approverId } });
        return { status: true, message: 'ອະນຸມັດ OT ສຳເລັດ' };
    }

    // ── Payroll ──
    static async payrollCalculate({ payroll_month, employee_ids }) {
        if (!payroll_month) throw Object.assign(new Error('ກະລຸນາລະບຸເດືອນ'), { status: 400 });
        const replacements = {};
        let empFilter = '';
        if (employee_ids?.length) { empFilter = `AND e.id = ANY(ARRAY[:empIds]::int[])`; replacements.empIds = employee_ids.map(Number); }
        const [employees] = await sequelize.query(`SELECT e.id, e.employee_code, e.status, ec.salary as base_salary, ec.working_hours FROM employees e LEFT JOIN employment_contracts ec ON ec.employee_id = e.id AND ec.deleted_at IS NULL WHERE e.status = 'ACTIVE' AND e.deleted_at IS NULL ${empFilter} ORDER BY e.id`, { replacements });
        const month = payroll_month.slice(0, 7);
        const results = [];
        const SSO_RATE = 0.055;

        for (const emp of employees) {
            const baseSalary = parseFloat(emp.base_salary || 0);
            // Allowances
            const [allowances] = await sequelize.query(`SELECT ea.amount, at.code, at.name_la, at.is_taxable FROM employee_allowances ea JOIN allowance_types at ON at.id = ea.allowance_type_id WHERE ea.employee_id = :eid AND ea.is_active = true AND ea.deleted_at IS NULL`, { replacements: { eid: emp.id } });
            let totalAllowance = 0, taxableAllowance = 0;
            const allowanceDetails = [];
            for (const a of allowances) {
                const amt = parseFloat(a.amount);
                totalAllowance += amt;
                if (a.is_taxable) taxableAllowance += amt;
                allowanceDetails.push({ code: a.code, name: a.name_la, amount: amt });
            }
            // OT
            const [otRecords] = await sequelize.query(`SELECT COALESCE(SUM(amount), 0) as total_ot FROM overtime_records WHERE employee_id = :eid AND status = 'APPROVED' AND TO_CHAR(work_date, 'YYYY-MM') = :month`, { replacements: { eid: emp.id, month } });
            const totalOT = parseFloat(otRecords[0]?.total_ot || 0);
            // Calculate
            const grossIncome = baseSalary + totalAllowance + totalOT;
            const socialSecurity = Math.round(baseSalary * SSO_RATE);
            const taxableIncome = baseSalary + taxableAllowance + totalOT - socialSecurity;
            const tax = await calculateTax(Math.max(0, taxableIncome));
            const netSalary = grossIncome - socialSecurity - tax;
            // Upsert payroll
            const [existing] = await sequelize.query(`SELECT id FROM payrolls WHERE employee_id = :eid AND payroll_month = :month AND deleted_at IS NULL`, { replacements: { eid: emp.id, month: payroll_month } });
            let payrollId;
            if (existing.length) {
                payrollId = existing[0].id;
                await sequelize.query(`UPDATE payrolls SET basic_salary = :basic, allowance = :allow, ot = :ot, deduction = 0, social_security = :sso, tax = :tax, net_salary = :net, updated_at = NOW() WHERE id = :id`, { replacements: { id: payrollId, basic: baseSalary, allow: totalAllowance, ot: totalOT, sso: socialSecurity, tax, net: netSalary } });
                await sequelize.query(`DELETE FROM payroll_details WHERE payroll_id = :pid`, { replacements: { pid: payrollId } });
            } else {
                const [ins] = await sequelize.query(`INSERT INTO payrolls (employee_id, payroll_month, basic_salary, allowance, ot, bonus, deduction, social_security, tax, net_salary, pay_date) VALUES (:eid, :month, :basic, :allow, :ot, 0, 0, :sso, :tax, :net, NULL) RETURNING id`, { replacements: { eid: emp.id, month: payroll_month, basic: baseSalary, allow: totalAllowance, ot: totalOT, sso: socialSecurity, tax, net: netSalary } });
                payrollId = ins[0].id;
            }
            // Details
            const details = [{ type: 'EARNING', code: 'BASIC', name: 'ເງິນເດືອນພື້ນຖານ', amount: baseSalary }, ...allowanceDetails.map(a => ({ type: 'EARNING', code: a.code, name: a.name, amount: a.amount }))];
            if (totalOT > 0) details.push({ type: 'EARNING', code: 'OT', name: 'ເງິນລ່ວງເວລາ', amount: totalOT });
            details.push({ type: 'DEDUCTION', code: 'SSO', name: 'ປະກັນສັງຄົມ (5.5%)', amount: socialSecurity });
            details.push({ type: 'DEDUCTION', code: 'TAX', name: 'ອາກອນເງິນເດືອນ', amount: tax });
            for (const d of details) {
                await sequelize.query(`INSERT INTO payroll_details (payroll_id, item_type, item_code, item_name, amount) VALUES (:pid, :type, :code, :name, :amount)`, { replacements: { pid: payrollId, type: d.type, code: d.code, name: d.name, amount: d.amount } });
            }
            results.push({ employee_id: emp.id, employee_code: emp.employee_code, payroll_id: payrollId, basic_salary: baseSalary, allowance: totalAllowance, ot: totalOT, social_security: socialSecurity, tax, net_salary: netSalary });
        }
        return { status: true, message: `ຄິດໄລ່ເງິນເດືອນ ເດືອນ ${month} ສຳເລັດ — ${results.length} ພະນັກງານ`, data: { month, count: results.length, payrolls: results } };
    }

    static async payrollSlip(payrollId) {
        const [payrolls] = await sequelize.query(`SELECT p.*, e.employee_code, pi.firstname__la, pi.lastname__la FROM payrolls p JOIN employees e ON e.id = p.employee_id LEFT JOIN personal_info pi ON pi.id = e.personal_info_id WHERE p.id = :pid`, { replacements: { pid: payrollId } });
        if (!payrolls.length) throw Object.assign(new Error('ບໍ່ພົບ'), { status: 404 });
        const [details] = await sequelize.query(`SELECT * FROM payroll_details WHERE payroll_id = :pid ORDER BY item_type, id`, { replacements: { pid: payrollId } });
        const earnings = details.filter(d => d.item_type === 'EARNING');
        const deductions = details.filter(d => d.item_type === 'DEDUCTION');
        return { status: true, data: { payroll: payrolls[0], earnings, deductions, totalEarnings: earnings.reduce((s, e) => s + parseFloat(e.amount), 0), totalDeductions: deductions.reduce((s, d) => s + parseFloat(d.amount), 0) } };
    }

    static async payrollFinalize({ payroll_month, pay_date }) {
        const [result] = await sequelize.query(`UPDATE payrolls SET pay_date = :pay_date, updated_at = NOW() WHERE payroll_month = :month AND pay_date IS NULL AND deleted_at IS NULL RETURNING id`, { replacements: { month: payroll_month, pay_date: pay_date || new Date().toISOString().split('T')[0] } });
        return { status: true, message: `ຢືນຢັນການຈ່າຍສຳເລັດ — ${result.length} ລາຍການ`, data: { finalized: result.length } };
    }

    static async payrollReport(month) {
        if (!month) throw Object.assign(new Error('ກະລຸນາລະບຸເດືອນ'), { status: 400 });
        const [rows] = await sequelize.query(`SELECT p.id, p.employee_id, p.payroll_month, p.basic_salary, p.allowance, p.ot, p.bonus, p.deduction, p.social_security, p.tax, p.net_salary, p.pay_date, e.employee_code, pi.firstname__la, pi.lastname__la FROM payrolls p JOIN employees e ON e.id = p.employee_id LEFT JOIN personal_info pi ON pi.id::text = e.personal_info_id::text WHERE p.payroll_month = :month AND p.deleted_at IS NULL AND p.basic_salary > 0 ORDER BY e.employee_code, e.id`, { replacements: { month } });
        const totals = { count: rows.length, basic_salary: 0, allowance: 0, ot: 0, bonus: 0, social_security: 0, tax: 0, deduction: 0, net_salary: 0 };
        for (const r of rows) { for (const k of Object.keys(totals)) { if (k !== 'count') totals[k] += parseFloat(r[k] || 0); } }
        let mfi = {};
        try { const [mi] = await sequelize.query(`SELECT name_la as mfi_name, license_no FROM mfi_info LIMIT 1`); if (mi.length) mfi = mi[0]; } catch (e) { /* skip */ }
        return { status: true, data: { month, employees: rows, totals, mfi } };
    }

    // ── Employee ──
    static async resign(id, { resignation_date, resignation_reason, last_working_date }) {
        await sequelize.query(`UPDATE employees SET status = 'RESIGNED', resignation_date = :res_date, resignation_reason = :reason, last_working_date = :last_date, updated_at = NOW() WHERE id = :id`, { replacements: { id, res_date: resignation_date || new Date().toISOString().split('T')[0], reason: resignation_reason || '', last_date: last_working_date || resignation_date || new Date().toISOString().split('T')[0] } });
        return { status: true, message: 'ບັນທຶກການລາອອກສຳເລັດ' };
    }

    static async certificate(empId) {
        empId = parseInt(empId);
        const [emps] = await sequelize.query(`SELECT * FROM employees WHERE id = :id LIMIT 1`, { replacements: { id: empId } });
        if (!emps.length) throw Object.assign(new Error('ບໍ່ພົບພະນັກງານ'), { status: 404 });
        const e = emps[0];
        const safeQ = async (sql, r) => { try { const [rows] = await sequelize.query(sql, { replacements: r }); return rows[0] || {}; } catch { return {}; } };
        const pi = e.personal_info_id ? await safeQ(`SELECT firstname__la, lastname__la, dateofbirth, gender_id FROM personal_info WHERE id = :id`, { id: parseInt(e.personal_info_id) }) : {};
        const dept = e.department_id ? await safeQ(`SELECT name as department_name FROM departments WHERE id = :id`, { id: parseInt(e.department_id) }) : {};
        const contract = await safeQ(`SELECT contract_type, salary, start_date as contract_start FROM employment_contracts WHERE employee_id = :id AND deleted_at IS NULL ORDER BY start_date DESC LIMIT 1`, { id: empId });
        const mfi = await safeQ(`SELECT name_la as mfi_name, license_no FROM mfi_info LIMIT 1`, {});
        const position = await safeQ(`SELECT ep.position_name FROM employee_assignments ea JOIN employee_positions ep ON ep.id = CAST(ea.position_id AS INTEGER) WHERE ea.employee_id = :id ORDER BY ea.id DESC LIMIT 1`, { id: empId });
        return { status: true, data: { id: e.id, employee_code: e.employee_code, hire_date: e.hire_date, status: e.status, resignation_date: e.resignation_date, resignation_reason: e.resignation_reason, last_working_date: e.last_working_date, ...pi, ...dept, ...contract, ...mfi, ...position } };
    }

    static async dashboard() {
        const [stats] = await sequelize.query(`SELECT (SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE' AND deleted_at IS NULL) as active_employees, (SELECT COUNT(*) FROM employees WHERE status = 'RESIGNED' AND deleted_at IS NULL) as resigned, (SELECT COUNT(*) FROM leave_requests WHERE status = 'PENDING') as pending_leaves, (SELECT COUNT(*) FROM overtime_records WHERE status = 'PENDING') as pending_ot, (SELECT COUNT(*) FROM leave_requests WHERE status = 'APPROVED' AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NOW())) as leaves_this_month`);
        return { status: true, data: stats[0] };
    }
}

module.exports = HRService;
