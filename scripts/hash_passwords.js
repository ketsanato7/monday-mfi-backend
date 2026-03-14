/**
 * hash_passwords.js — ແປງ password ທັງໝົດໃນ DB ເປັນ bcrypt hash
 * 
 * ການໃຊ້: node scripts/hash_passwords.js
 * 
 * ⚠️ ແລ່ນ 1 ຄັ້ງເທົ່ານັ້ນ ຫຼັງ deploy ຄັ້ງທຳອິດ
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,
    { host: process.env.DB_HOST, port: process.env.DB_PORT || 5432, dialect: 'postgres', logging: false }
);

async function hashAllPasswords() {
    try {
        await sequelize.authenticate();
        console.log('✅ ເຊື່ອມຕໍ່ DB ສຳເລັດ');

        // ດຶງ users ທັງໝົດ
        const users = await sequelize.query(
            'SELECT id, email, password_hash FROM users',
            { type: QueryTypes.SELECT }
        );

        console.log(`📋 ພົບ ${users.length} users`);
        let updated = 0;

        for (const user of users) {
            // ກວດວ່າ password_hash ເປັນ bcrypt ແລ້ວ ຫຼື ຍັງ
            if (user.password_hash && user.password_hash.startsWith('$2')) {
                console.log(`  ⏭ ${user.email} — ເປັນ bcrypt ແລ້ວ`);
                continue;
            }

            // ຖ້າເປັນ plaintext ຫຼື empty → hash ດ້ວຍ bcrypt
            const plainPassword = user.password_hash || '@demo1';
            const hashed = await bcrypt.hash(plainPassword, 10);

            await sequelize.query(
                'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
                { bind: [hashed, user.id] }
            );

            console.log(`  ✅ ${user.email} — hashed ສຳເລັດ`);
            updated++;
        }

        console.log(`\n🎉 ອັບເດດ ${updated}/${users.length} users`);
        console.log('⚠️ Default password: @demo1 — ຄວນໃຫ້ users ປ່ຽນ password ຫຼັງ login ຄັ້ງທຳອິດ');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

hashAllPasswords();
