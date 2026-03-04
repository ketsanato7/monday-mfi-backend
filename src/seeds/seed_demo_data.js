/**
 * seed_demo_data.js — ສ້າງ ຂໍ້ ມູນ ທົດ ສອບ ທັງ ໝົດ ຕາມ ລຳ ດັບ FK dependency
 *
 * ລຳ ດັບ: enterprise_info → mfi_info link → personal_info → employees → users → link borrowers
 *
 * ໃຊ້: node src/seeds/seed_demo_data.js
 */
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME || 'monday',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
    }
);

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ ເຊື່ອມ DB ສຳເລັດ\n');

        // ─── Step 1: ກວດ/ສ້າງ enterprise_info ສຳ ລັບ MFI ──────────────
        console.log('━━━ Step 1: Enterprise Info ສຳ ລັບ MFI ━━━');
        let [eiRows] = await sequelize.query(
            `SELECT id FROM enterprise_info WHERE register_no = 'BOL-MFI-102' LIMIT 1`
        );
        let enterpriseId;
        if (eiRows.length > 0) {
            enterpriseId = eiRows[0].id;
            console.log(`  ✅ ມີ ແລ້ວ enterprise_info id=${enterpriseId}`);
        } else {
            // ກວດ ຂໍ້ ມູນ ທີ່ ມີ ແລ້ວ
            const [existing] = await sequelize.query(`SELECT id FROM enterprise_info LIMIT 1`);
            if (existing.length > 0) {
                enterpriseId = existing[0].id;
                // ອັບເດດ register_no
                await sequelize.query(
                    `UPDATE enterprise_info SET register_no = 'BOL-MFI-102' WHERE id = :id`,
                    { replacements: { id: enterpriseId } }
                );
                console.log(`  ✅ ໃຊ้ enterprise_info ທີ່ ມີ ແລ້ວ id=${enterpriseId}, ອັບເດດ register_no`);
            } else {
                const [result] = await sequelize.query(`
                    INSERT INTO enterprise_info ("name__l_a", "name__e_n", register_no, registrant)
                    VALUES ('ສະຖາບັນການເງິນ ແກ້ວຈະເລີນ', 'Kaew Jaroen MFI', 'BOL-MFI-102', 'ທະນາຄານແຫ່ງ ສປປ ລາວ')
                    RETURNING id
                `);
                enterpriseId = result[0].id;
                console.log(`  ✅ ສ້າງ enterprise_info id=${enterpriseId}`);
            }
        }

        // ─── Step 2: Link mfi_info → enterprise_info ──────────────
        console.log('\n━━━ Step 2: Link MFI → Enterprise ━━━');
        const [mfiRows] = await sequelize.query(`SELECT id, enterprise_info_id FROM mfi_info LIMIT 1`);
        if (mfiRows.length > 0) {
            if (!mfiRows[0].enterprise_info_id) {
                await sequelize.query(
                    `UPDATE mfi_info SET enterprise_info_id = :eid WHERE id = :id`,
                    { replacements: { eid: enterpriseId, id: mfiRows[0].id } }
                );
                console.log(`  ✅ Linked mfi_info.id=${mfiRows[0].id} → enterprise_info_id=${enterpriseId}`);
            } else {
                console.log(`  ✅ ມີ ແລ້ວ enterprise_info_id=${mfiRows[0].enterprise_info_id}`);
            }
        } else {
            console.log(`  ⚠️ ບໍ່ ມີ mfi_info ໃນ DB`);
        }

        // ─── Step 3: ສ້າງ personal_info (5 ຄົນ) ──────────────
        console.log('\n━━━ Step 3: Personal Info (5 ຄົນ) ━━━');

        // ກວດ dict IDs ທີ່ ມີ ແລ້ວ
        const [genders] = await sequelize.query(`SELECT id FROM genders ORDER BY id LIMIT 3`);
        const [careers] = await sequelize.query(`SELECT id FROM careers ORDER BY id LIMIT 5`);
        const [mStatuses] = await sequelize.query(`SELECT id FROM marital_statuses ORDER BY id LIMIT 3`);
        const [countries] = await sequelize.query(`SELECT id FROM countries WHERE id = 1 OR id = (SELECT MIN(id) FROM countries) LIMIT 1`);
        const [villages] = await sequelize.query(`SELECT id FROM villages ORDER BY id LIMIT 5`);

        const gid = (i) => genders[i % genders.length]?.id || 1;
        const cid = (i) => careers[i % careers.length]?.id || 1;
        const mid = (i) => mStatuses[i % mStatuses.length]?.id || 1;
        const nid = countries[0]?.id || 1;
        const vid = (i) => villages[i % villages.length]?.id || 1;

        const people = [
            { fn_la: 'ສົມພອນ', ln_la: 'ພົມມະວົງ', fn_en: 'Somphone', ln_en: 'Phommavong', dob: '1990-05-15', gi: 0, ci: 0, mi: 1, vi: 0, role: 'customer' },
            { fn_la: 'ບຸນມີ', ln_la: 'ສີສະຫວາດ', fn_en: 'Bounmy', ln_en: 'Sisavath', dob: '1988-08-20', gi: 0, ci: 1, mi: 1, vi: 1, role: 'customer' },
            { fn_la: 'ຄຳພອນ', ln_la: 'ວົງພະຈັນ', fn_en: 'Khamphone', ln_en: 'Vongphachan', dob: '1992-12-01', gi: 1, ci: 2, mi: 0, vi: 2, role: 'customer' },
            { fn_la: 'ວິໄລພອນ', ln_la: 'ແສງຈັນ', fn_en: 'Vilaphone', ln_en: 'Saengchan', dob: '1985-03-10', gi: 0, ci: 3, mi: 1, vi: 3, role: 'employee' },
            { fn_la: 'ນາງຄຳ', ln_la: 'ພູມີໄຊ', fn_en: 'Nangkham', ln_en: 'Phoumisay', dob: '1993-07-25', gi: 1, ci: 4, mi: 0, vi: 4, role: 'employee' },
        ];

        const personIds = [];
        for (const p of people) {
            // ກວດ ວ່າ ມີ ແລ້ວ ບໍ
            const [existing] = await sequelize.query(
                `SELECT id FROM personal_info WHERE "firstname__la" = :fn AND "lastname__la" = :ln LIMIT 1`,
                { replacements: { fn: p.fn_la, ln: p.ln_la } }
            );
            if (existing.length > 0) {
                personIds.push({ id: existing[0].id, role: p.role });
                console.log(`  ✅ ມີ ແລ້ວ: ${p.fn_la} ${p.ln_la} (id=${existing[0].id})`);
            } else {
                const [result] = await sequelize.query(`
                    INSERT INTO personal_info (
                        "firstname__la", "lastname__la", "firstname__en", "lastname__en",
                        dateofbirth, gender_id, career_id, marital_status_id, nationality_id, village_id
                    ) VALUES (
                        :fn_la, :ln_la, :fn_en, :ln_en,
                        :dob, :gid, :cid, :mid, :nid, :vid
                    ) RETURNING id
                `, {
                    replacements: {
                        fn_la: p.fn_la, ln_la: p.ln_la, fn_en: p.fn_en, ln_en: p.ln_en,
                        dob: p.dob, gid: gid(p.gi), cid: cid(p.ci), mid: mid(p.mi), nid, vid: vid(p.vi)
                    }
                });
                personIds.push({ id: result[0].id, role: p.role });
                console.log(`  ✅ ສ້າງ: ${p.fn_la} ${p.ln_la} (id=${result[0].id}) [${p.role}]`);
            }
        }

        // ─── Step 4: ສ້າງ employees (shared PK ກັບ personal_info) ──────────────
        console.log('\n━━━ Step 4: Employees (2 ຄົນ) ━━━');
        const employeePersonIds = personIds.filter(p => p.role === 'employee');
        const [educations] = await sequelize.query(`SELECT id FROM educations ORDER BY id LIMIT 1`);
        const eduId = educations[0]?.id || 1;

        const employeeIds = [];
        for (const ep of employeePersonIds) {
            const [existing] = await sequelize.query(
                `SELECT id FROM employees WHERE id = :id LIMIT 1`,
                { replacements: { id: ep.id } }
            );
            if (existing.length > 0) {
                employeeIds.push(ep.id);
                console.log(`  ✅ ມີ ແລ້ວ: employee id=${ep.id}`);
            } else {
                await sequelize.query(`
                    INSERT INTO employees (id, education_level_id)
                    VALUES (:id, :edu)
                `, { replacements: { id: ep.id, edu: eduId } });
                employeeIds.push(ep.id);
                console.log(`  ✅ ສ້າງ: employee id=${ep.id}`);
            }
        }

        // ─── Step 5: ສ້າງ users ──────────────
        console.log('\n━━━ Step 5: Users (2 ຄົນ) ━━━');

        // ກວດ users columns
        const [userCols] = await sequelize.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`
        );
        const userColNames = userCols.map(c => c.column_name);
        const hasUsername = userColNames.includes('username');
        const hasEmail = userColNames.includes('email');
        const hasPassword = userColNames.includes('password_hash') || userColNames.includes('password');
        const passCol = userColNames.includes('password_hash') ? 'password_hash' : 'password';

        const demoUsers = [
            { empId: employeeIds[0], email: 'superadmin@monday.com', username: 'superadmin', name: 'Super Admin' },
            { empId: employeeIds[1], email: 'admin@kaewjaroen.la', username: 'admin_kj', name: 'Admin ແກ້ວຈະເລີນ' },
        ];

        const userIds = [];
        for (const u of demoUsers) {
            if (!u.empId) continue;
            const [existing] = await sequelize.query(
                `SELECT id FROM users WHERE employee_id = :eid LIMIT 1`,
                { replacements: { eid: u.empId } }
            );
            if (existing.length > 0) {
                userIds.push(existing[0].id);
                console.log(`  ✅ ມີ ແລ້ວ: user id=${existing[0].id} (${u.email})`);
            } else {
                // Build dynamic insert based on available columns
                let cols = ['employee_id'];
                let vals = [':empId'];
                let replacements = { empId: u.empId };

                if (hasEmail) { cols.push('email'); vals.push(':email'); replacements.email = u.email; }
                if (hasUsername) { cols.push('username'); vals.push(':username'); replacements.username = u.username; }
                if (hasPassword) { cols.push(`"${passCol}"`); vals.push(':pass'); replacements.pass = '$2b$10$demo_hash_placeholder'; }

                // Add timestamps if columns exist
                if (userColNames.includes('created_at')) { cols.push('created_at'); vals.push('NOW()'); }
                if (userColNames.includes('updated_at')) { cols.push('updated_at'); vals.push('NOW()'); }

                const [result] = await sequelize.query(
                    `INSERT INTO users (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING id`,
                    { replacements }
                );
                userIds.push(result[0].id);
                console.log(`  ✅ ສ້າງ: user id=${result[0].id} (${u.email})`);
            }
        }

        // ─── Step 6: Assign user_roles ──────────────
        console.log('\n━━━ Step 6: User Roles ━━━');
        const [superRole] = await sequelize.query(`SELECT id FROM roles WHERE code = 'SUPER_ADMIN' LIMIT 1`);
        const [branchRole] = await sequelize.query(`SELECT id FROM roles WHERE code = 'BRANCH_MANAGER' LIMIT 1`);

        if (userIds[0] && superRole[0]) {
            await sequelize.query(`
                INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
                VALUES (:uid, :rid, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `, { replacements: { uid: userIds[0], rid: superRole[0].id } });
            console.log(`  ✅ user ${userIds[0]} → SUPER_ADMIN`);
        }
        if (userIds[1] && branchRole[0]) {
            await sequelize.query(`
                INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
                VALUES (:uid, :rid, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `, { replacements: { uid: userIds[1], rid: branchRole[0].id } });
            console.log(`  ✅ user ${userIds[1]} → BRANCH_MANAGER`);
        }

        // ─── Step 7: Link borrowers_individual → personal_info ──────────────
        console.log('\n━━━ Step 7: Link Borrowers → Personal Info ━━━');
        const customerIds = personIds.filter(p => p.role === 'customer').map(p => p.id);
        const [borrowers] = await sequelize.query(
            `SELECT id, personal_info_id FROM borrowers_individual WHERE personal_info_id IS NULL ORDER BY id LIMIT :cnt`,
            { replacements: { cnt: customerIds.length } }
        );
        for (let i = 0; i < Math.min(borrowers.length, customerIds.length); i++) {
            await sequelize.query(
                `UPDATE borrowers_individual SET personal_info_id = :pid WHERE id = :bid`,
                { replacements: { pid: customerIds[i], bid: borrowers[i].id } }
            );
            console.log(`  ✅ borrower id=${borrowers[i].id} → personal_info_id=${customerIds[i]}`);
        }
        if (borrowers.length === 0) {
            console.log('  ℹ️  ບໍ່ ມີ borrowers ທີ່ ຕ້ອງ link (ທັງ ໝົດ ມີ personal_info_id ແລ້ວ ຫຼື ບໍ່ ມີ ຂໍ້ ມູນ)');
        }

        // ─── Step 8: ເພີ່ມ FK constraints ──────────────
        console.log('\n━━━ Step 8: ເພີ່ມ FK Constraints ━━━');
        const fkStatements = [
            {
                name: 'fk_borrower_ind_person',
                sql: `ALTER TABLE borrowers_individual ADD CONSTRAINT fk_borrower_ind_person FOREIGN KEY (personal_info_id) REFERENCES personal_info(id)`
            },
            {
                name: 'fk_borrower_ent_enterprise',
                sql: `ALTER TABLE borrowers_enterprise ADD CONSTRAINT fk_borrower_ent_enterprise FOREIGN KEY (enterprise_id) REFERENCES enterprise_info(id)`
            },
            {
                name: 'fk_loan_app_person',
                sql: `ALTER TABLE loan_applications ADD CONSTRAINT fk_loan_app_person FOREIGN KEY (personal_info_id) REFERENCES personal_info(id)`
            },
            {
                name: 'fk_loan_app_enterprise',
                sql: `ALTER TABLE loan_applications ADD CONSTRAINT fk_loan_app_enterprise FOREIGN KEY (enterprise_info_id) REFERENCES enterprise_info(id)`
            },
            {
                name: 'fk_loan_app_product',
                sql: `ALTER TABLE loan_applications ADD CONSTRAINT fk_loan_app_product FOREIGN KEY (loan_product_id) REFERENCES loan_products(id)`
            },
            {
                name: 'fk_dep_owner_enterprise',
                sql: `ALTER TABLE deposit_account_owners ADD CONSTRAINT fk_dep_owner_enterprise FOREIGN KEY (enterprise_id) REFERENCES enterprise_info(id)`
            },
        ];

        for (const fk of fkStatements) {
            try {
                await sequelize.query(fk.sql);
                console.log(`  ✅ ${fk.name}`);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log(`  ✅ ${fk.name} (ມີ ແລ້ວ)`);
                } else if (err.message.includes('violates foreign key')) {
                    console.log(`  ⚠️ ${fk.name} — orphan data ຕ້ອງ ລ້າງ ກ່ອນ`);
                } else {
                    console.log(`  ⚠️ ${fk.name} — ${err.message.split('\n')[0]}`);
                }
            }
        }

        // ─── Summary ──────────────
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅✅✅ Seed Demo Data ສຳ ເລັດ!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Count summary
        const counts = {};
        for (const t of ['personal_info', 'employees', 'users', 'user_roles', 'borrowers_individual', 'enterprise_info', 'mfi_info']) {
            const [r] = await sequelize.query(`SELECT COUNT(*) as cnt FROM ${t}`);
            counts[t] = r[0].cnt;
        }
        console.log('\n📊 ສະ ຫຼຸບ:');
        Object.entries(counts).forEach(([k, v]) => console.log(`   ${k}: ${v} ແຖວ`));

    } catch (err) {
        console.error('❌ Seed ຜິດ ພາດ:', err.message);
        console.error(err.stack);
    } finally {
        await sequelize.close();
    }
}

seed();
