/**
 * mfi-registration.routes.js — MFI Registration API
 * POST /create-staff — ສ້າງ employee + user + user_roles (transaction)
 */
const logger = require('../config/logger');
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Password policy regex: ≥8, uppercase, lowercase, digit, special
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * POST /api/mfi-registration/create-staff
 * Body: { staffList: [{ personal_info_id, org_id, mfi_id, employee_code,
 *         position_id, department_id, username, password, role_id }] }
 */
router.post('/create-staff', async (req, res) => {
    const { staffList } = req.body;

    if (!staffList || !Array.isArray(staffList) || staffList.length === 0) {
        return res.status(400).json({ status: false, message: 'ກະລຸນາເພີ່ມພະນັກງານຢ່າງໜ້ອຍ 1 ຄົນ' });
    }

    const db = require('../models');
    const { QueryTypes } = require('sequelize');
    const t = await db.sequelize.transaction();

    try {
        const results = [];

        for (const staff of staffList) {
            const {
                personal_info_id, org_id, mfi_id, employee_code,
                position_id, department_id, username, password, role_id
            } = staff;

            // ── Validate ──
            if (!personal_info_id || !org_id || !username || !password || !role_id) {
                throw new Error('ຂໍ້ມູນບໍ່ຄົບ: personal_info_id, org_id, username, password, role_id');
            }

            // Password policy
            if (!PASSWORD_REGEX.test(password)) {
                throw new Error(`ລະຫັດຜ່ານ "${username}" ບໍ່ຖືກ policy: ≥8 ຕົວ, ໂຕໃຫຍ່+ນ້ອຍ+ເລກ+ພິເສດ`);
            }

            // Check username unique
            const existing = await db.sequelize.query(
                'SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL LIMIT 1',
                { bind: [username], type: QueryTypes.SELECT, transaction: t }
            );
            if (existing.length > 0) {
                throw new Error(`Username "${username}" ຖືກໃຊ້ແລ້ວ`);
            }

            // 1. Create employee
            const [empResult] = await db.sequelize.query(
                `INSERT INTO employees (personal_info_id, org_id, employee_code, department_id, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW())
                 RETURNING id`,
                {
                    bind: [personal_info_id, org_id, employee_code || null, department_id || null],
                    type: QueryTypes.SELECT,
                    transaction: t,
                }
            );
            const employeeId = empResult.id;

            // 2. Create employee_positions (if position_id provided)
            if (position_id) {
                await db.sequelize.query(
                    `INSERT INTO employee_positions (employee_id, position_id, created_at, updated_at)
                     VALUES ($1, $2, NOW(), NOW())`,
                    { bind: [employeeId, position_id], transaction: t }
                );
            }

            // 3. Create employee_assignments (link to MFI)
            if (mfi_id) {
                await db.sequelize.query(
                    `INSERT INTO employee_assignments (employee_id, mfi_id, start_date, is_current, created_at, updated_at)
                     VALUES ($1, $2, CURRENT_DATE, true, NOW(), NOW())`,
                    { bind: [employeeId, mfi_id], transaction: t }
                );
            }

            // 4. Create user (bcrypt password)
            const passwordHash = await bcrypt.hash(password, 10);
            const [userResult] = await db.sequelize.query(
                `INSERT INTO users (employee_id, username, password_hash, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, true, NOW(), NOW())
                 RETURNING id`,
                {
                    bind: [employeeId, username, passwordHash],
                    type: QueryTypes.SELECT,
                    transaction: t,
                }
            );
            const userId = userResult.id;

            // 5. Create user_roles
            await db.sequelize.query(
                `INSERT INTO user_roles (user_id, role_id, assigned_at, created_at, updated_at)
                 VALUES ($1, $2, NOW(), NOW(), NOW())`,
                { bind: [userId, role_id], transaction: t }
            );

            // Get role code for response
            const [roleInfo] = await db.sequelize.query(
                'SELECT code FROM roles WHERE id = $1',
                { bind: [role_id], type: QueryTypes.SELECT, transaction: t }
            );

            results.push({
                employee_id: employeeId,
                user_id: userId,
                username,
                role_code: roleInfo?.code || 'unknown',
            });
        }

        await t.commit();
        res.json({ status: true, data: results, message: `✅ ສ້າງ ${results.length} ບັນຊີ ສຳເລັດ` });
    } catch (err) {
        await t.rollback();
        logger.error('create-staff error:', err.message);
        res.status(400).json({ status: false, message: err.message });
    }
});

module.exports = router;
