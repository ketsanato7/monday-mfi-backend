const express = require('express');
const router = express.Router();
const db = require('../models');
const bcrypt = require('bcryptjs');
const { requirePermission } = require('../middleware/rbac');

// ═══════════════════════════════════════
// 1. Institution Management
// ═══════════════════════════════════════

// GET all institutions
router.get('/admin/institutions', async (req, res) => {
    try {
        const orgs = await db.organizations.findAll({ order: [['createdAt', 'DESC']] });
        res.json(orgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST register new institution + superadmin
router.post('/admin/institutions', requirePermission('ຈັດການຜູ້ໃຊ້'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { org, admin } = req.body;

        // 1. Create organization
        const organization = await db.organizations.create({
            code: org.code,
            name: org.name,
            business_type: org.business_type || 'MFI',
            tax_id: org.tax_id || '',
            address: org.address || '',
            phone_number: org.phone_number || '',
            logo_url: org.logo_url || '',
        }, { transaction: t });

        // 2. Create or find SUPERADMIN role
        let role = await db.roles.findOne({ where: { code: 'SUPERADMIN' } });
        if (!role) {
            role = await db.roles.create({
                code: 'SUPERADMIN',
                name: 'Super Administrator',
                description: 'ສິດສູງສຸດຂອງສະຖາບັນ',
                is_system: true,
            }, { transaction: t });
        }

        // 3. Create user with hashed password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(admin.password, salt);

        const user = await db.users.create({
            username: admin.username,
            password_hash,
            org_code: org.code,
            role_id: role.id,
            is_active: true,
        }, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            message: 'ລົງທະບຽນສະຖາບັນສຳເລັດ!',
            data: {
                organization: { code: organization.code, name: organization.name },
                user: { id: user.id, username: user.username, role: role.name },
            }
        });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

// DELETE institution
router.delete('/admin/institutions/:code', requirePermission('ຈັດການຜູ້ໃຊ້'), async (req, res) => {
    try {
        await db.organizations.destroy({ where: { code: req.params.code } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════
// 2. Role Permissions
// ═══════════════════════════════════════

// GET all roles
router.get('/admin/roles', async (req, res) => {
    try {
        const roles = await db.roles.findAll({ order: [['id', 'ASC']] });
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET permissions for a role
router.get('/admin/role-permissions/:roleId', async (req, res) => {
    try {
        const allPermissions = await db.permissions.findAll({ order: [['module', 'ASC'], ['id', 'ASC']] });
        const rolePerms = await db.role_permissions.findAll({
            where: { role_id: req.params.roleId }
        });
        const assignedIds = rolePerms.map(rp => rp.permission_id);

        const result = allPermissions.map(p => ({
            ...p.toJSON(),
            assigned: assignedIds.includes(p.id),
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update permissions for a role
router.put('/admin/role-permissions/:roleId', requirePermission('ຈັດການບົດບາດ'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { roleId } = req.params;
        const { permission_ids } = req.body; // array of permission IDs

        // Delete existing
        await db.role_permissions.destroy({
            where: { role_id: roleId },
            transaction: t,
        });

        // Insert new
        if (permission_ids && permission_ids.length > 0) {
            const records = permission_ids.map(pid => ({
                role_id: parseInt(roleId),
                permission_id: pid,
            }));
            await db.role_permissions.bulkCreate(records, { transaction: t });
        }

        await t.commit();
        res.json({ success: true, count: permission_ids?.length || 0 });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════
// 3. Menu Items Management
// ═══════════════════════════════════════

// GET all menu items
router.get('/admin/menu-items', async (req, res) => {
    try {
        const items = await db.menu_items.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST seed menu items (sync from navigation_new.tsx)
router.post('/admin/menu-items/seed', async (req, res) => {
    try {
        const { items } = req.body; // array of { segment, title, parent_segment, icon, sort_order }
        let created = 0;
        for (const item of items) {
            const [record, wasCreated] = await db.menu_items.findOrCreate({
                where: { segment: item.segment },
                defaults: {
                    title: item.title,
                    parent_segment: item.parent_segment || null,
                    icon: item.icon || null,
                    sort_order: item.sort_order || 0,
                },
            });
            if (wasCreated) created++;
        }
        res.json({ success: true, created, total: items.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════
// 4. Role Menu Management
// ═══════════════════════════════════════

// GET menu visibility for a role
router.get('/admin/role-menus/:roleId', async (req, res) => {
    try {
        const allMenus = await db.menu_items.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC'], ['id', 'ASC']],
        });
        const roleMenus = await db.role_menus.findAll({
            where: { role_id: req.params.roleId },
        });
        const visibleMap = {};
        roleMenus.forEach(rm => { visibleMap[rm.menu_item_id] = rm.is_visible; });

        const result = allMenus.map(m => ({
            ...m.toJSON(),
            is_visible: visibleMap[m.id] !== undefined ? visibleMap[m.id] : false,
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update menu visibility for a role
router.put('/admin/role-menus/:roleId', requirePermission('ຈັດການບົດບາດ'), async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { roleId } = req.params;
        const { menu_ids } = req.body; // array of visible menu item IDs

        // Delete existing
        await db.role_menus.destroy({
            where: { role_id: roleId },
            transaction: t,
        });

        // Insert new
        if (menu_ids && menu_ids.length > 0) {
            const records = menu_ids.map(mid => ({
                role_id: parseInt(roleId),
                menu_item_id: mid,
                is_visible: true,
            }));
            await db.role_menus.bulkCreate(records, { transaction: t });
        }

        await t.commit();
        res.json({ success: true, count: menu_ids?.length || 0 });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});

// GET visible menus for current user (for frontend navigation)
router.get('/admin/my-menus/:roleId', async (req, res) => {
    try {
        const roleMenus = await db.role_menus.findAll({
            where: { role_id: req.params.roleId, is_visible: true },
        });
        const menuIds = roleMenus.map(rm => rm.menu_item_id);
        const menus = await db.menu_items.findAll({
            where: { id: menuIds, is_active: true },
            order: [['sort_order', 'ASC']],
        });
        res.json(menus);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════
// 5. Permissions CRUD
// ═══════════════════════════════════════

// GET all permissions
router.get('/admin/permissions', async (req, res) => {
    try {
        const perms = await db.permissions.findAll({ order: [['module', 'ASC'], ['id', 'ASC']] });
        res.json(perms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST seed default permissions
router.post('/admin/permissions/seed', async (req, res) => {
    try {
        const modules = [
            { module: 'loans', name: 'ບໍລິການເງິນກູ້' },
            { module: 'deposits', name: 'ບໍລິການເງິນຝາກ' },
            { module: 'accounting', name: 'ບັນຊີ' },
            { module: 'org', name: 'ໂຄງສ້າງອົງກອນ' },
            { module: 'hr', name: 'ບຸກຄະລາກອນ' },
            { module: 'reports', name: 'ລາຍງານ' },
            { module: 'users', name: 'ຜູ້ໃຊ້ລະບົບ' },
            { module: 'dictionary', name: 'ຂໍ້ມູນພື້ນຖານ' },
        ];
        const actions = ['view', 'create', 'update', 'delete'];
        let created = 0;

        for (const mod of modules) {
            for (const action of actions) {
                const code = `${mod.module}.${action}`;
                const [record, wasCreated] = await db.permissions.findOrCreate({
                    where: { code },
                    defaults: {
                        name: `${mod.name} - ${action}`,
                        module: mod.module,
                    },
                });
                if (wasCreated) created++;
            }
        }

        res.json({ success: true, created });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
