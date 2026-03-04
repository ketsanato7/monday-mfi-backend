/**
 * seed_chart_of_accounts.js
 * 
 * ອ່ານ ຂໍ້ມູນ ຜັງບັນຊີ ຈາກ file Excel BOL
 * ແລ້ວ insert ເຂົ້າ table chart_of_accounts
 * 
 * ວິທີໃຊ້: node src/seeds/seed_chart_of_accounts.js
 * 
 * Excel columns → DB columns:
 *   account → account_code
 *   title   → account_name_la
 *   group   → account_type (1=ASSET, 2=LIABILITY, 3=EQUITY, 4=EXPENSE, 5=REVENUE)
 */
require('dotenv').config();

async function seed() {
    const xlsx = require('xlsx');
    const path = require('path');
    const db = require('../models');
    const COA = db['chart_of_accounts'];

    // ── ອ່ານ file Excel ──
    const xlsxPath = path.resolve(__dirname, '../../../web-admin/non-bank-financial-institution-chart-of-accounts-Laos.xlsx');
    console.log('📂 ອ່ານ file:', xlsxPath);

    const workbook = xlsx.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`📊 ພົບ ${rows.length} ລາຍການ ໃນ sheet "${sheetName}"`);

    // ── ແປ group → account_type ──
    const GROUP_MAP = {
        '1': 'ASSET',
        '2': 'LIABILITY',
        '3': 'EQUITY',
        '4': 'EXPENSE',
        '5': 'REVENUE',
    };

    // ── ຄຳນວນ level ──
    function getLevel(code) {
        const len = String(code).length;
        if (len <= 2) return 1;
        if (len <= 3) return 2;
        if (len <= 4) return 3;
        if (len <= 5) return 4;
        return 5;
    }

    // ── Insert ──
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
        const accountCode = String(row.account || '').trim();
        const accountNameLa = String(row.title || '').trim();
        const group = String(row.group || '').trim();

        if (!accountCode || !accountNameLa) {
            skipped++;
            continue;
        }

        try {
            // ກວດ ວ່າ ມີ ແລ້ວ ຫຼື ບໍ່ (by account_code)
            const existing = await COA.findOne({ where: { account_code: accountCode } });
            if (existing) {
                skipped++;
                continue;
            }

            await COA.create({
                account_code: accountCode,
                account_name_la: accountNameLa,
                account_name_en: '',
                coa_type: '',
                account_type: GROUP_MAP[group] || 'OTHER',
                level: getLevel(accountCode),
                parent_account_id: null,
                is_active: true,
                currency_code: '',
                description: '',
            });
            created++;
        } catch (err) {
            errors++;
            if (errors <= 5) {
                console.error(`  ❌ ${accountCode}: ${err.message}`);
            }
        }
    }

    console.log(`\n📊 ສຳເລັດ:`);
    console.log(`  ✅ ສ້າງໃໝ່: ${created} ລາຍການ`);
    console.log(`  ⏩ ຂ້າມ: ${skipped} ລາຍການ`);
    if (errors > 0) console.log(`  ❌ ຜິດພາດ: ${errors} ລາຍການ`);

    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Fatal:', err.message);
    process.exit(1);
});
