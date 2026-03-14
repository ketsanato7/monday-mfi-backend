/**
 * seed-users.js — ອັບເດດ password ໃຫ້ users ທີ່ມີ + ສ້າງ permissions
 *
 * ໃຊ້: node scripts/seed-users.js
 *
 * DB Schema:
 *   users: id, username, password_hash, employee_id, is_active
 *   roles: id, code, name, description
 *   user_roles: id, user_id, role_id, assigned_at
 *   role_permissions: role_id, permission_id (no id column)
 *   permissions: id, code, name, module
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize, QueryTypes } = require('sequelize');
const dbConfig = require('../src/config/database');

const sequelize = new Sequelize(
    dbConfig.database, dbConfig.user, dbConfig.password,
    { host: dbConfig.host, port: dbConfig.port, dialect: 'postgres', logging: false }
);

// ═══ Permissions ═══
const PERMISSIONS = [
    { code: 'VIEW_LOAN', name: 'ເບິ່ງສິນເຊື່ອ', module: 'loan' },
    { code: 'CREATE_LOAN', name: 'ສ້າງສິນເຊື່ອ', module: 'loan' },
    { code: 'EDIT_LOAN', name: 'ແກ້ໄຂສິນເຊື່ອ', module: 'loan' },
    { code: 'DELETE_LOAN', name: 'ລຶບສິນເຊື່ອ', module: 'loan' },
    { code: 'APPROVE_LOAN', name: 'ອະນຸມັດສິນເຊື່ອ', module: 'loan' },
    { code: 'DISBURSE', name: 'ເບີກຈ່າຍ', module: 'loan' },
    { code: 'VIEW_DEPOSIT', name: 'ເບິ່ງເງິນຝາກ', module: 'deposit' },
    { code: 'CREATE_DEPOSIT', name: 'ສ້າງເງິນຝາກ', module: 'deposit' },
    { code: 'EDIT_DEPOSIT', name: 'ແກ້ໄຂເງິນຝາກ', module: 'deposit' },
    { code: 'VIEW_ACCOUNTING', name: 'ເບິ່ງບັນຊີ', module: 'accounting' },
    { code: 'EDIT_ACCOUNTING', name: 'ແກ້ໄຂບັນຊີ', module: 'accounting' },
    { code: 'VIEW_REPORT', name: 'View report', module: 'report' },
    { code: 'EXPORT_REPORT', name: 'ສົ່ງອອກລາຍງານ', module: 'report' },
    { code: 'MANAGE_USERS', name: 'ຈັດການຜູ້ໃຊ້', module: 'admin' },
    { code: 'MANAGE_ROLES', name: 'ຈັດການບົດບາດ', module: 'admin' },
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // ── 1. ສ້າງ/ອັບເດດ permissions ──
        console.log('\n📋 Creating permissions...');
        for (const perm of PERMISSIONS) {
            await sequelize.query(
                `INSERT INTO permissions (code, name, module, created_at, updated_at)
                 VALUES ($1, $2, $3, NOW(), NOW())
                 ON CONFLICT (code) DO UPDATE SET name = $2, module = $3, updated_at = NOW()`,
                { bind: [perm.code, perm.name, perm.module] }
            );
        }
        const allPerms = await sequelize.query('SELECT id, code, name FROM permissions', { type: QueryTypes.SELECT });
        console.log(`   ✅ ${allPerms.length} permissions ready`);

        // ── 2. ກຳນົດ permissions ໃຫ້ superadmin role ──
        console.log('\n🔐 Assigning permissions to superadmin role...');
        const superadminRole = await sequelize.query(
            "SELECT id FROM roles WHERE name = 'superadmin' OR code = 'SUPERADMIN' LIMIT 1",
            { type: QueryTypes.SELECT }
        );
        if (superadminRole.length > 0) {
            const roleId = superadminRole[0].id;
            for (const perm of allPerms) {
                const existing = await sequelize.query(
                    'SELECT role_id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
                    { bind: [roleId, perm.id], type: QueryTypes.SELECT }
                );
                if (existing.length === 0) {
                    await sequelize.query(
                        `INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
                         VALUES ($1, $2, NOW(), NOW())`,
                        { bind: [roleId, perm.id] }
                    );
                }
            }
            console.log(`   ✅ superadmin role (id=${roleId}) has all ${allPerms.length} permissions`);
        } else {
            console.log('   ⚠️ superadmin role not found — creating...');
            await sequelize.query(
                `INSERT INTO roles (code, name, description, created_at, updated_at)
                 VALUES ('SUPERADMIN', 'superadmin', 'Super Administrator', NOW(), NOW())
                 ON CONFLICT (code) DO NOTHING`,
                {}
            );
        }

        // ── 3. ອັບເດດ password ໃຫ້ superadmin user ──
        console.log('\n👤 Updating user passwords...');
        const superadminUser = await sequelize.query(
            "SELECT id, username FROM users WHERE username = 'superadmin' LIMIT 1",
            { type: QueryTypes.SELECT }
        );

        if (superadminUser.length > 0) {
            const hash = await bcrypt.hash('Admin@1234', 10);
            await sequelize.query(
                'UPDATE users SET password_hash = $1, is_active = true, updated_at = NOW() WHERE id = $2',
                { bind: [hash, superadminUser[0].id] }
            );
            console.log(`   ✅ Updated: superadmin (id=${superadminUser[0].id}) password → Admin@1234`);
        } else {
            // ສ້າງ superadmin user ໃໝ່
            const hash = await bcrypt.hash('Admin@1234', 10);
            const [result] = await sequelize.query(
                `INSERT INTO users (username, password_hash, is_active, created_at, updated_at)
                 VALUES ('superadmin', $1, true, NOW(), NOW()) RETURNING id`,
                { bind: [hash] }
            );
            const newId = result[0]?.id;
            console.log(`   ✅ Created: superadmin user (id=${newId})`);

            // Assign superadmin role
            if (newId && superadminRole.length > 0) {
                await sequelize.query(
                    `INSERT INTO user_roles (user_id, role_id, assigned_at, created_at, updated_at)
                     VALUES ($1, $2, NOW(), NOW(), NOW())`,
                    { bind: [newId, superadminRole[0].id] }
                );
            }
        }

        // ── 4. ສ້າງ/ອັບເດດ staff user ──
        const staffUser = await sequelize.query(
            "SELECT id, username FROM users WHERE username = 'staff' LIMIT 1",
            { type: QueryTypes.SELECT }
        );

        const staffHash = await bcrypt.hash('Staff@1234', 10);
        if (staffUser.length > 0) {
            await sequelize.query(
                'UPDATE users SET password_hash = $1, is_active = true, updated_at = NOW() WHERE id = $2',
                { bind: [staffHash, staffUser[0].id] }
            );
            console.log(`   ✅ Updated: staff (id=${staffUser[0].id}) password → Staff@1234`);
        } else {
            const [result] = await sequelize.query(
                `INSERT INTO users (username, password_hash, is_active, created_at, updated_at)
                 VALUES ('staff', $1, true, NOW(), NOW()) RETURNING id`,
                { bind: [staffHash] }
            );
            const newId = result[0]?.id;
            console.log(`   ✅ Created: staff user (id=${newId})`);

            // Assign staff role
            const staffRole = await sequelize.query(
                "SELECT id FROM roles WHERE name = 'staff' OR code = 'STAFF' LIMIT 1",
                { type: QueryTypes.SELECT }
            );
            if (newId && staffRole.length > 0) {
                await sequelize.query(
                    `INSERT INTO user_roles (user_id, role_id, assigned_at, created_at, updated_at)
                     VALUES ($1, $2, NOW(), NOW(), NOW())`,
                    { bind: [newId, staffRole[0].id] }
                );
            }
        }

        console.log('\n✅ ════════════════════════════════════');
        console.log('   Seed ສຳເລັດ! ໃຊ້ credentials ນີ້:');
        console.log('   ────────────────────────────────────');
        console.log('   👤 username: superadmin / password: Admin@1234');
        console.log('   👤 username: staff / password: Staff@1234');
        console.log('   ════════════════════════════════════\n');

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        console.error(err.stack);
    } finally {
        await sequelize.close();
    }
}

seed();
