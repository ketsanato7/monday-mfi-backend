/**
 * seed_all.js — Master Seed Script ສຳ ລັບ Monday MFI
 * 
 * ປ້ອນ ຂໍ້ ມູນ ເລີ່ມ ຕົ້ນ ທີ່ ຈຳ ເປັນ:
 * - loan_products (ຜະ ລິດ ຕະ ພັນ ເງິນ ກູ້)
 * - deposit_products (ຜະ ລິດ ຕະ ພັນ ເງິນ ຝາກ)
 * 
 * Usage: node src/seeds/seed_all.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'test1',
    process.env.DB_USER || 'vee',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
    }
);

async function seedLoanProducts() {
    console.log('📋 Seeding loan_products...');
    const rows = [
        { la: 'ສິນເຊື່ອບຸກຄົນ', en: 'Personal Loan', type: 'FLAT', min: 12.00, max: 18.00, cur: 1 },
        { la: 'ສິນເຊື່ອທຸລະກິດ', en: 'Business Loan', type: 'DECLINING', min: 10.00, max: 15.00, cur: 1 },
        { la: 'ສິນເຊື່ອກະສິກຳ', en: 'Agriculture Loan', type: 'FLAT', min: 8.00, max: 12.00, cur: 1 },
        { la: 'ສິນເຊື່ອທີ່ຢູ່ອາໄສ', en: 'Housing Loan', type: 'DECLINING', min: 9.00, max: 14.00, cur: 1 },
        { la: 'ສິນເຊື່ອສຸກເສີນ', en: 'Emergency Loan', type: 'FLAT', min: 15.00, max: 24.00, cur: 1 },
        { la: 'ສິນເຊື່ອການສຶກສາ', en: 'Education Loan', type: 'DECLINING', min: 7.00, max: 10.00, cur: 1 },
    ];

    for (const r of rows) {
        const [existing] = await sequelize.query(
            `SELECT 1 FROM loan_products WHERE product_name_la = '${r.la.replace(/'/g, "''")}'`
        );
        if (existing.length === 0) {
            await sequelize.query(
                `INSERT INTO loan_products (product_name_la, product_name_en, interest_rate_type, min_interest_rate, max_interest_rate, currency_id)
                 VALUES ('${r.la.replace(/'/g, "''")}', '${r.en}', '${r.type}', ${r.min}, ${r.max}, ${r.cur})`
            );
        }
    }
    const [result] = await sequelize.query('SELECT count(*) as c FROM loan_products');
    console.log(`   ✅ loan_products: ${result[0].c} records`);
}

async function seedDepositProducts() {
    console.log('📋 Seeding deposit_products...');
    const rows = [
        { la: 'ເງິນ ຝາກ ປະ ຢັດ', en: 'Savings', rate: 3.50, min: 50000, term: 0, cur: 1 },
        { la: 'ເງິນ ຝາກ ປະ ຈຳ 6 ເດືອນ', en: 'Fixed 6M', rate: 5.00, min: 1000000, term: 6, cur: 1 },
        { la: 'ເງິນ ຝາກ ປະ ຈຳ 12 ເດືອນ', en: 'Fixed 12M', rate: 6.50, min: 1000000, term: 12, cur: 1 },
        { la: 'ເງິນ ຝາກ ກະ ແສ ລາຍ ວັນ', en: 'Current', rate: 1.00, min: 100000, term: 0, cur: 1 },
    ];

    for (const r of rows) {
        const [existing] = await sequelize.query(
            `SELECT 1 FROM deposit_products WHERE product_name_la = '${r.la.replace(/'/g, "''")}'`
        );
        if (existing.length === 0) {
            await sequelize.query(
                `INSERT INTO deposit_products (product_name_la, product_name_en, interest_rate, minimum_balance, term_months, currency_id)
                 VALUES ('${r.la.replace(/'/g, "''")}', '${r.en}', ${r.rate}, ${r.min}, ${r.term}, ${r.cur})`
            );
        }
    }
    const [result] = await sequelize.query('SELECT count(*) as c FROM deposit_products');
    console.log(`   ✅ deposit_products: ${result[0].c} records`);
}

async function main() {
    console.log('🌱 Monday MFI — Master Seed Script');
    console.log('='.repeat(40));

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        await seedLoanProducts();
        await seedDepositProducts();

        console.log('\n🎉 Seed completed successfully!');
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

main();
