/**
 * admin.service.js — Admin CRUD (Institutions, Roles, Permissions, Menus)
 */
const db = require('../models');
const bcrypt = require('bcryptjs');

class AdminService {
    static async getInstitutions() { return db.organizations.findAll({ order: [['createdAt', 'DESC']] }); }

    static async createInstitution({ org, admin }) {
        const t = await db.sequelize.transaction();
        try {
            const organization = await db.organizations.create({
                code: org.code, name: org.name, business_type: org.business_type || 'MFI',
                tax_id: org.tax_id || '', address: org.address || '',
                phone_number: org.phone_number || '', logo_url: org.logo_url || '',
            }, { transaction: t });
            let role = await db.roles.findOne({ where: { code: 'SUPERADMIN' } });
            if (!role) role = await db.roles.create({
                code: 'SUPERADMIN', name: 'Super Administrator',
                description: 'ສິດສູງສຸດ', is_system: true,
            }, { transaction: t });
            const hash = await bcrypt.hash(admin.password, await bcrypt.genSalt(10));
            const user = await db.users.create({
                username: admin.username, password_hash: hash,
                org_code: org.code, role_id: role.id, is_active: true,
            }, { transaction: t });
            await t.commit();
            return { success: true, message: 'ລົງທະບຽນສະຖາບັນສຳເລັດ!', data: { organization: { code: organization.code, name: organization.name }, user: { id: user.id, username: user.username, role: role.name } } };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async deleteInstitution(code) {
        await db.organizations.destroy({ where: { code } });
        return { success: true };
    }

    static async getRoles() { return db.roles.findAll({ order: [['id', 'ASC']] }); }

    static async getRolePermissions(roleId) {
        const all = await db.permissions.findAll({ order: [['module', 'ASC'], ['id', 'ASC']] });
        const rp = await db.role_permissions.findAll({ where: { role_id: roleId } });
        const ids = rp.map(r => r.permission_id);
        return all.map(p => ({ ...p.toJSON(), assigned: ids.includes(p.id) }));
    }

    static async updateRolePermissions(roleId, ids) {
        const t = await db.sequelize.transaction();
        try {
            await db.role_permissions.destroy({ where: { role_id: roleId }, transaction: t });
            if (ids?.length) await db.role_permissions.bulkCreate(
                ids.map(pid => ({ role_id: parseInt(roleId), permission_id: pid })), { transaction: t }
            );
            await t.commit();
            return { success: true, count: ids?.length || 0 };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async getMenuItems() {
        return db.menu_items.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    }

    static async seedMenuItems(items) {
        let created = 0;
        for (const item of items) {
            const [, w] = await db.menu_items.findOrCreate({
                where: { segment: item.segment },
                defaults: { title: item.title, parent_segment: item.parent_segment || null, icon: item.icon || null, sort_order: item.sort_order || 0 },
            });
            if (w) created++;
        }
        return { success: true, created, total: items.length };
    }

    static async getRoleMenus(roleId) {
        const all = await db.menu_items.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
        const rm = await db.role_menus.findAll({ where: { role_id: roleId } });
        const map = {}; rm.forEach(r => { map[r.menu_item_id] = r.is_visible; });
        return all.map(m => ({ ...m.toJSON(), is_visible: map[m.id] !== undefined ? map[m.id] : false }));
    }

    static async updateRoleMenus(roleId, ids) {
        const t = await db.sequelize.transaction();
        try {
            await db.role_menus.destroy({ where: { role_id: roleId }, transaction: t });
            if (ids?.length) await db.role_menus.bulkCreate(
                ids.map(mid => ({ role_id: parseInt(roleId), menu_item_id: mid, is_visible: true })), { transaction: t }
            );
            await t.commit();
            return { success: true, count: ids?.length || 0 };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async getMyMenus(roleId) {
        const rm = await db.role_menus.findAll({ where: { role_id: roleId, is_visible: true } });
        const ids = rm.map(r => r.menu_item_id);
        return db.menu_items.findAll({ where: { id: ids, is_active: true }, order: [['sort_order', 'ASC']] });
    }

    static async getPermissions() {
        return db.permissions.findAll({ order: [['module', 'ASC'], ['id', 'ASC']] });
    }

    static async seedPermissions() {
        const mods = [
            { module: 'loans', name: 'ເງິນກູ້' }, { module: 'deposits', name: 'ເງິນຝາກ' },
            { module: 'accounting', name: 'ບັນຊີ' }, { module: 'org', name: 'ອົງກອນ' },
            { module: 'hr', name: 'ບຸກຄະລາກອນ' }, { module: 'reports', name: 'ລາຍງານ' },
            { module: 'users', name: 'ຜູ້ໃຊ້' }, { module: 'dictionary', name: 'ພື້ນຖານ' },
        ];
        const actions = ['view', 'create', 'update', 'delete'];
        let created = 0;
        for (const m of mods) {
            for (const a of actions) {
                const [, w] = await db.permissions.findOrCreate({
                    where: { code: `${m.module}.${a}` },
                    defaults: { name: `${m.name} - ${a}`, module: m.module },
                });
                if (w) created++;
            }
        }
        return { success: true, created };
    }
}

module.exports = AdminService;
