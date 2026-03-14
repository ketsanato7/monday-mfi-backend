/**
 * auth.service.js — Login, Logout, Me, Permissions, Change Password
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const { QueryTypes } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = '8h';

class AuthService {
    static async login(email, password) {
        if (!email || !password) throw Object.assign(new Error('ກະລຸນາປ້ອນ Username ແລະ Password'), { status: 400 });
        const users = await db.sequelize.query(`SELECT u.id, u.username, u.password_hash, u.employee_id, u.is_active, r.name as role_name, e.org_id, COALESCE(pi.firstname__la || ' ' || pi.lastname__la, u.username) as display_name FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id LEFT JOIN employees e ON e.id = u.employee_id LEFT JOIN personal_info pi ON pi.id = e.personal_info_id WHERE u.username = $1 AND u.deleted_at IS NULL LIMIT 1`, { bind: [email], type: QueryTypes.SELECT });
        if (!users.length) throw Object.assign(new Error('ຂໍ້ມູນເຂົ້າລະບົບບໍ່ຖືກຕ້ອງ'), { status: 401 });
        const user = users[0];
        if (user.is_active === false) throw Object.assign(new Error('ບັນຊີຖືກ disable ແລ້ວ'), { status: 403 });
        if (!(await bcrypt.compare(password, user.password_hash || ''))) throw Object.assign(new Error('ຂໍ້ມູນເຂົ້າລະບົບບໍ່ຖືກຕ້ອງ'), { status: 401 });
        await db.sequelize.query('UPDATE users SET last_login = NOW() WHERE id = $1', { bind: [user.id] });
        const role = user.role_name || 'staff';
        const payload = { id: user.id, username: user.username, name: user.display_name, role, employee_id: user.employee_id || null, org_id: user.org_id || null };
        const mfaService = require('./mfa.service');
        if (await mfaService.isEnabled(user.id, db)) {
            return { mfa_required: true, tempToken: jwt.sign({ ...payload, mfa_pending: true }, JWT_SECRET, { expiresIn: '5m' }), user: { id: user.id, name: user.display_name, email: user.username, role }, message: 'MFA required — enter your 6-digit code' };
        }
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        return { status: true, token, user: { id: user.id, name: user.display_name, email: user.username, role, image: '' } };
    }

    static async me(authHeader) {
        if (!authHeader?.startsWith('Bearer ')) throw Object.assign(new Error('No token provided'), { status: 401 });
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const profiles = await db.sequelize.query(`SELECT u.id, u.username, COALESCE(pi.firstname__la || ' ' || pi.lastname__la, u.username) as display_name, pi.firstname__la, pi.lastname__la, r.name as role_name, r.id as role_id, e.org_id, e.employee_code FROM users u LEFT JOIN employees e ON e.id = u.employee_id LEFT JOIN personal_info pi ON pi.id = e.personal_info_id LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id WHERE u.id = $1 LIMIT 1`, { bind: [decoded.id], type: QueryTypes.SELECT });
        const p = profiles[0] || {};
        let orgName = '', orgCode = '';
        const orgId = p.org_id || decoded.org_id;
        if (orgId) { try { const orgs = await db.sequelize.query(`SELECT code, name FROM organizations WHERE code = $1 LIMIT 1`, { bind: [String(orgId)], type: QueryTypes.SELECT }); if (orgs.length) { orgName = orgs[0].name; orgCode = orgs[0].code; } } catch { /* org lookup optional */ } }
        return { id: decoded.id, name: p.display_name || decoded.name || 'User', firstname: p.firstname__la || '', lastname: p.lastname__la || '', email: p.username || decoded.username || '', role: p.role_name || decoded.role || 'staff', role_id: p.role_id || null, employee_id: decoded.employee_id || null, employee_code: p.employee_code || '', org_id: orgId || null, org_name: orgName, org_name_en: '', position: '', image: '' };
    }

    static async permissions(authHeader) {
        if (!authHeader?.startsWith('Bearer ')) throw Object.assign(new Error('No token'), { status: 401 });
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded.role === 'superadmin') { const allPerms = await db.sequelize.query('SELECT name FROM permissions ORDER BY id', { type: QueryTypes.SELECT }); return { permissions: allPerms.map(p => p.name), role: 'superadmin' }; }
        const { getUserPermissions } = require('../middleware/rbac');
        return { permissions: await getUserPermissions(decoded.id), role: decoded.role };
    }

    static async changePassword(authHeader, currentPassword, newPassword) {
        if (!authHeader?.startsWith('Bearer ')) throw Object.assign(new Error('No token'), { status: 401 });
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (!currentPassword || !newPassword) throw Object.assign(new Error('ກະລຸນາປ້ອນລະຫັດເກົ່າ ແລະ ໃໝ່'), { status: 400 });
        if (newPassword.length < 8) throw Object.assign(new Error('ລະຫັດໃໝ່ ຕ້ອງ 8 ຕົວຂຶ້ນໄປ'), { status: 400 });
        const users = await db.sequelize.query('SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1', { bind: [decoded.id], type: QueryTypes.SELECT });
        if (!users.length) throw Object.assign(new Error('ບໍ່ພົບ user'), { status: 404 });
        if (!(await bcrypt.compare(currentPassword, users[0].password_hash || ''))) throw Object.assign(new Error('ລະຫັດເກົ່າ ບໍ່ຖືກຕ້ອງ'), { status: 401 });
        await db.sequelize.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', { bind: [await bcrypt.hash(newPassword, 10), decoded.id] });
        return { message: 'ປ່ຽນລະຫັດສຳເລັດ' };
    }
}

module.exports = AuthService;
