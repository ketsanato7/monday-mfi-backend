const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME || 'test1',
    process.env.DB_USER || 'vee',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false,
    }
);

async function updatePassword() {
    try {
        const hash = await bcrypt.hash('password', 10);
        await sequelize.query(
            `UPDATE users SET password_hash = :hash WHERE username = 'superadmin'`,
            { replacements: { hash } }
        );
        console.log('✅ Password updated for superadmin');
    } catch (err) {
        console.error('❌ Error updating password:', err);
    } finally {
        await sequelize.close();
    }
}

updatePassword();
