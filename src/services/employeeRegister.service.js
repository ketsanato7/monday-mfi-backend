/**
 * employeeRegister.service.js — Employee Registration (16 tables in 1 transaction)
 * ═════════════════════════════════════════════════════════════════════════════════
 * Methods: registerFull, getFull, updateFull
 */
const logger = require('../config/logger');
const db = require('../models');
const sequelize = db.sequelize;

const SOFT_DELETE_TABLES = new Set(['lao_id_cards', 'family_books', 'passports', 'employees', 'employment_contracts', 'health_insurance', 'trainings', 'staff_compliance', 'employee_assignments', 'employee_positions', 'employee_allowances']);

async function insertMany(table, fkField, fkValue, items, t) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
        const fields = { ...item, [fkField]: fkValue };
        delete fields.id; delete fields.created_at; delete fields.updated_at; delete fields.deleted_at;
        const keys = Object.keys(fields).filter(k => fields[k] !== undefined && fields[k] !== '');
        if (keys.length <= 1) continue;
        await sequelize.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, { bind: keys.map(k => fields[k]), transaction: t });
    }
}

async function replaceMany(table, fkField, fkValue, items, t) {
    if (!Array.isArray(items)) return;
    if (SOFT_DELETE_TABLES.has(table)) {
        await sequelize.query(`UPDATE ${table} SET deleted_at = NOW() WHERE ${fkField} = $1 AND deleted_at IS NULL`, { bind: [fkValue], transaction: t });
    } else {
        await sequelize.query(`DELETE FROM ${table} WHERE ${fkField} = $1`, { bind: [fkValue], transaction: t });
    }
    await insertMany(table, fkField, fkValue, items, t);
}

function selectQuery(table, fkField) {
    const where = SOFT_DELETE_TABLES.has(table) ? `WHERE ${fkField} = :v AND deleted_at IS NULL` : `WHERE ${fkField} = :v`;
    return `SELECT * FROM ${table} ${where}`;
}

class EmployeeRegisterService {
    static async registerFull(body) {
        const { personal_info, lao_id_cards, family_books, passports, addresses, contact_details, employee, employment_contracts, health_insurance, trainings, staff_compliance, employee_assignments, employee_branch_assignments, employee_positions, employee_allowances } = body;
        if (!personal_info?.firstname__la) throw Object.assign(new Error('ກະລຸນາປ້ອນ ຊື່ບຸກຄົນ'), { status: 400 });

        const t = await sequelize.transaction();
        try {
            // 1. personal_info
            const piFields = Object.keys(personal_info).filter(k => personal_info[k] !== undefined && personal_info[k] !== '');
            const [piResult] = await sequelize.query(`INSERT INTO personal_info (${piFields.join(', ')}) VALUES (${piFields.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`, { bind: piFields.map(k => personal_info[k]), transaction: t });
            const personId = piResult[0].id;

            // 2. person_id FK
            await insertMany('lao_id_cards', 'person_id', personId, lao_id_cards, t);
            await insertMany('family_books', 'person_id', personId, family_books, t);
            await insertMany('passports', 'person_id', personId, passports, t);
            await insertMany('addresses', 'person_id', personId, addresses, t);
            await insertMany('contact_details', 'person_id', personId, contact_details, t);

            // 3. employee
            const empData = { ...employee, personal_info_id: personId };
            const empFields = Object.keys(empData).filter(k => empData[k] !== undefined && empData[k] !== '');
            const [empResult] = await sequelize.query(`INSERT INTO employees (${empFields.join(', ')}) VALUES (${empFields.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`, { bind: empFields.map(k => empData[k]), transaction: t });
            const employeeId = empResult[0].id;

            // 4. employee_id FK
            await insertMany('employment_contracts', 'employee_id', employeeId, employment_contracts, t);
            await insertMany('health_insurance', 'employee_id', employeeId, health_insurance, t);
            await insertMany('trainings', 'employee_id', employeeId, trainings, t);
            await insertMany('employee_assignments', 'employee_id', employeeId, employee_assignments, t);
            await insertMany('employee_branch_assignments', 'employee_id', employeeId, employee_branch_assignments, t);
            await insertMany('employee_positions', 'employee_id', employeeId, employee_positions, t);
            await insertMany('employee_allowances', 'employee_id', employeeId, employee_allowances, t);

            // 5. staff_compliance
            if (staff_compliance && Object.keys(staff_compliance).length > 0) {
                const fields = { ...staff_compliance, employee_id: employeeId };
                const keys = Object.keys(fields);
                await sequelize.query(`INSERT INTO staff_compliance (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, { bind: Object.values(fields), transaction: t });
            }

            await t.commit();
            return { status: true, message: 'ລົງທະບຽນພະນັກງານສຳເລັດ (16 tables)', data: { person_id: personId, employee_id: employeeId } };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async getFull(empId) {
        empId = parseInt(empId);
        const [employees] = await sequelize.query(`SELECT e.*, pi.*, e.id as employee_id, pi.id as person_id, e.contact_info as emp_contact_info, e.org_id as emp_org_id FROM employees e LEFT JOIN personal_info pi ON pi.id = e.personal_info_id WHERE e.id = :id AND e.deleted_at IS NULL`, { replacements: { id: empId } });
        if (!employees.length) throw Object.assign(new Error('ບໍ່ພົບພະນັກງານ'), { status: 404 });
        const emp = employees[0];
        const pid = emp.person_id;
        const q = (table, fk, val) => sequelize.query(selectQuery(table, fk), { replacements: { v: val } });

        const [laoIdCards] = await q('lao_id_cards', 'person_id', pid);
        const [familyBooks] = await q('family_books', 'person_id', pid);
        const [passportsList] = await q('passports', 'person_id', pid);
        const [addressesList] = await q('addresses', 'person_id', pid);
        const [contactDetailsList] = await q('contact_details', 'person_id', pid);
        const [contracts] = await q('employment_contracts', 'employee_id', empId);
        const [insurance] = await q('health_insurance', 'employee_id', empId);
        const [trainingsList] = await q('trainings', 'employee_id', empId);
        const [compliance] = await q('staff_compliance', 'employee_id', empId);
        const [assignments] = await q('employee_assignments', 'employee_id', empId);
        const [branchAssignments] = await q('employee_branch_assignments', 'employee_id', empId);
        const [positions] = await q('employee_positions', 'employee_id', empId);
        const [allowances] = await q('employee_allowances', 'employee_id', empId);

        return {
            status: true, data: {
                personal_info: { id: pid, firstname__la: emp.firstname__la, lastname__la: emp.lastname__la, firstname__en: emp.firstname__en, lastname__en: emp.lastname__en, dateofbirth: emp.dateofbirth, age: emp.age, gender_id: emp.gender_id, marital_status_id: emp.marital_status_id, nationality_id: emp.nationality_id, career_id: emp.career_id, village_id: emp.village_id, phone_number: emp.phone_number, home_address: emp.home_address, contact_info: emp.contact_info, personal_code: emp.personal_code, mobile_no: emp.mobile_no, telephone_no: emp.telephone_no, spouse_firstname: emp.spouse_firstname, spouse_lastname: emp.spouse_lastname, spouse_career_id: emp.spouse_career_id, spouse_mobile_number: emp.spouse_mobile_number, total_family_members: emp.total_family_members, females: emp.females, org_id: emp.org_id },
                employee: { id: emp.employee_id, employee_code: emp.employee_code, org_id: emp.emp_org_id, department_id: emp.department_id, education_level_id: emp.education_level_id, field_of_study: emp.field_of_study, contact_info: emp.emp_contact_info, date_of_employment: emp.date_of_employment, hire_date: emp.hire_date, employment_type: emp.employment_type, status: emp.status, resignation_date: emp.resignation_date, resignation_reason: emp.resignation_reason, last_working_date: emp.last_working_date, salary_grade_id: emp.salary_grade_id },
                lao_id_cards: laoIdCards, family_books: familyBooks, passports: passportsList, addresses: addressesList, contact_details: contactDetailsList, employment_contracts: contracts, health_insurance: insurance, trainings: trainingsList, staff_compliance: compliance[0] || null, employee_assignments: assignments, employee_branch_assignments: branchAssignments, employee_positions: positions, employee_allowances: allowances,
            }
        };
    }

    static async updateFull(empId, body) {
        empId = parseInt(empId);
        const { personal_info, employee, lao_id_cards, family_books, passports, addresses, contact_details, employment_contracts, health_insurance, trainings, staff_compliance, employee_assignments, employee_branch_assignments, employee_positions, employee_allowances } = body;
        const t = await sequelize.transaction();
        try {
            const [existing] = await sequelize.query(`SELECT personal_info_id FROM employees WHERE id = :id AND deleted_at IS NULL`, { replacements: { id: empId }, transaction: t });
            if (!existing.length) { await t.rollback(); throw Object.assign(new Error('ບໍ່ພົບພະນັກງານ'), { status: 404 }); }
            const personId = existing[0].personal_info_id;

            // Update personal_info
            if (personal_info && personId) {
                const piF = Object.keys(personal_info).filter(k => k !== 'id' && personal_info[k] !== undefined);
                if (piF.length > 0) {
                    const set = piF.map((k, i) => `${k} = $${i + 1}`).join(', ');
                    const vals = piF.map(k => personal_info[k]); vals.push(personId);
                    await sequelize.query(`UPDATE personal_info SET ${set}, updated_at = NOW() WHERE id = $${vals.length}`, { bind: vals, transaction: t });
                }
            }
            // Update employee
            if (employee) {
                const eF = Object.keys(employee).filter(k => k !== 'id' && employee[k] !== undefined);
                if (eF.length > 0) {
                    const set = eF.map((k, i) => `${k} = $${i + 1}`).join(', ');
                    const vals = eF.map(k => employee[k]); vals.push(empId);
                    await sequelize.query(`UPDATE employees SET ${set}, updated_at = NOW() WHERE id = $${vals.length}`, { bind: vals, transaction: t });
                }
            }
            // Replace FK arrays
            await replaceMany('lao_id_cards', 'person_id', personId, lao_id_cards, t);
            await replaceMany('family_books', 'person_id', personId, family_books, t);
            await replaceMany('passports', 'person_id', personId, passports, t);
            await replaceMany('addresses', 'person_id', personId, addresses, t);
            await replaceMany('contact_details', 'person_id', personId, contact_details, t);
            await replaceMany('employment_contracts', 'employee_id', empId, employment_contracts, t);
            await replaceMany('health_insurance', 'employee_id', empId, health_insurance, t);
            await replaceMany('trainings', 'employee_id', empId, trainings, t);
            await replaceMany('employee_assignments', 'employee_id', empId, employee_assignments, t);
            await replaceMany('employee_branch_assignments', 'employee_id', empId, employee_branch_assignments, t);
            await replaceMany('employee_positions', 'employee_id', empId, employee_positions, t);
            await replaceMany('employee_allowances', 'employee_id', empId, employee_allowances, t);
            // Upsert staff_compliance
            if (staff_compliance && Object.keys(staff_compliance).length > 0) {
                const scF = Object.keys(staff_compliance).filter(k => k !== 'id' && staff_compliance[k] !== undefined);
                if (scF.length > 0) {
                    const [existSc] = await sequelize.query(`SELECT id FROM staff_compliance WHERE employee_id = $1 AND deleted_at IS NULL`, { bind: [empId], transaction: t });
                    if (existSc.length > 0) {
                        const set = scF.map((k, i) => `${k} = $${i + 1}`).join(', ');
                        const vals = scF.map(k => staff_compliance[k]); vals.push(empId);
                        await sequelize.query(`UPDATE staff_compliance SET ${set}, updated_at = NOW() WHERE employee_id = $${vals.length}`, { bind: vals, transaction: t });
                    } else {
                        const fields = { ...staff_compliance, employee_id: empId };
                        const keys = Object.keys(fields);
                        await sequelize.query(`INSERT INTO staff_compliance (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`, { bind: Object.values(fields), transaction: t });
                    }
                }
            }
            await t.commit();
            return { status: true, message: 'ອັບເດດ ສຳເລັດ (16 tables)' };
        } catch (err) { await t.rollback(); throw err; }
    }
}

module.exports = EmployeeRegisterService;
