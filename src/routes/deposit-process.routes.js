/**
 * deposit-process.routes.js — API ເປີດບັນຊີເງິນຝາກ (7-step single transaction)
 * 
 * Pipeline:
 *  ① personal_info / enterprise_info
 *  ② KYC document (lao_id_cards / family_books / passports)
 *  ③ deposit_accounts (+ maturity + min balance check)
 *  ④ deposit_account_owners
 *  ⑤ deposit_transactions (OPENING)
 *  ⑥ journal_entries + lines (Dr 11011 / Cr 2131x)
 *  ⑦ COMMIT
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;
const { requirePermission } = require('../middleware/rbac');

// ═══════════════════════════════════════════
// Product → COA Account mapping
// ═══════════════════════════════════════════
const DEPOSIT_ACCOUNT_MAP = {
    // deposit_products.id → chart_of_accounts.id for Cr
    1: { coaId: 1008, code: '213113', name: 'ເງິນຝາກປະຢັດ', prefix: 'S' },          // Savings
    2: { coaId: 1010, code: '213115', name: 'ເງິນຝາກມີກຳນົດ', prefix: 'F' },         // Fixed 6M
    3: { coaId: 1010, code: '213115', name: 'ເງິນຝາກມີກຳນົດ', prefix: 'F' },         // Fixed 12M
    4: { coaId: 1007, code: '213111', name: 'ເງິນຝາກກະແສລາຍວັນ', prefix: 'C' },     // Current
};
const CASH_COA_ID = 3; // 11011 ເງິນສົດໃນຄັງ

// GET /api/deposit-process/products — ດຶງ products ສຳລັບ dropdown
router.get('/deposit-process/products', async (_req, res) => {
    try {
        const products = await db.deposit_products.findAll({ order: [['id', 'ASC']] });
        res.json({ status: true, data: products });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// GET /api/deposit-process/accounts — ດຶງ DataGrid (VIEW)
router.get('/deposit-process/accounts', async (_req, res) => {
    try {
        const [rows] = await sequelize.query('SELECT * FROM v_deposit_accounts');
        res.json({ status: true, data: rows });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// POST /api/deposit-process — ເປີດບັນຊີໃໝ່ (7-step)
// ═══════════════════════════════════════════
router.post('/deposit-process', requirePermission('ສ້າງເງິນຝາກ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            ownerType,          // 'individual' | 'enterprise'
            personalInfo,       // optional: new person data
            enterpriseInfo,     // optional: new enterprise data
            existingPersonId,   // number | null
            existingEnterpriseId,
            productId,          // deposit_products.id
            currencyId,         // currencies.id
            openingBalance,     // number
            // KYC document
            documentType,       // 'id_card' | 'family_book' | 'passport' | null
            document,           // { card_no, card_name, ... } | null
        } = req.body;

        let personId = existingPersonId || null;
        let enterpriseId = existingEnterpriseId || null;

        // ═══════════════════════════════════════════
        // ⓪ AML VALIDATION (ກົດໝາຍ ມາດຕາ 16)
        // ═══════════════════════════════════════════
        if (ownerType === 'individual' && !documentType) {
            throw new Error('ກະລຸນາເລືອກເອກະສານ KYC (ບັດປະຈຳຕົວ/ປື້ມຄອບຄົວ/ພາສປອດ) ຕາມກົດໝາຍ AML ມາດຕາ 16');
        }

        // ═══════════════════════════════════════════
        // ① CREATE/SELECT OWNER
        // ═══════════════════════════════════════════
        if (ownerType === 'individual' && !personId && personalInfo) {
            const person = await db.personal_info.create({
                firstname__la: personalInfo.firstname__la,
                lastname__la: personalInfo.lastname__la,
                firstname__en: personalInfo.firstname__en || null,
                lastname__en: personalInfo.lastname__en || null,
                dateofbirth: personalInfo.dateofbirth || null,
                gender_id: personalInfo.gender_id,
                career_id: personalInfo.career_id,
                marital_status_id: personalInfo.marital_status_id,
                nationality_id: personalInfo.nationality_id,
                village_id: personalInfo.village_id,
                mobile_no: personalInfo.mobile_no || null,
                telephone_no: personalInfo.telephone_no || null,
                home_address: personalInfo.home_address || null,
            }, { transaction: t });
            personId = person.id;
            console.log(`✅ ① personal_info created: id=${personId}`);
        }

        if (ownerType === 'enterprise' && !enterpriseId && enterpriseInfo) {
            const [eiResult] = await sequelize.query(`
                INSERT INTO enterprise_info ("name__l_a", "name__e_n", register_no, registrant,
                    enterprise_type_id, enterprise_size_id, village_id, tax_no, mobile_no)
                VALUES (:name_la, :name_en, :reg_no, :registrant, :type_id, :size_id, :village_id, :tax_no, :mobile)
                RETURNING id
            `, {
                replacements: {
                    name_la: enterpriseInfo.name__l_a, name_en: enterpriseInfo.name__e_n || '',
                    reg_no: enterpriseInfo.register_no, registrant: enterpriseInfo.registrant || '',
                    type_id: enterpriseInfo.enterprise_type_id || null,
                    size_id: enterpriseInfo.enterprise_size_id || null,
                    village_id: enterpriseInfo.village_id || null,
                    tax_no: enterpriseInfo.tax_no || null, mobile: enterpriseInfo.mobile_no || null,
                }, transaction: t,
            });
            enterpriseId = eiResult[0].id;
            console.log(`✅ ① enterprise_info created: id=${enterpriseId}`);
        }

        // ═══════════════════════════════════════════
        // ② KYC DOCUMENT
        // ═══════════════════════════════════════════
        let docRecord = null;
        const docPersonId = personId; // link doc to person
        if (documentType && document && docPersonId) {
            if (documentType === 'id_card') {
                docRecord = await db.lao_id_cards.create({
                    card_no: document.card_no,
                    card_name: document.card_name || null,
                    date_of_issue: document.date_of_issue || null,
                    exp_date: document.exp_date || null,
                    person_id: docPersonId,
                }, { transaction: t });
            } else if (documentType === 'family_book') {
                docRecord = await db.family_books.create({
                    book_no: document.book_no,
                    book_name: document.book_name || null,
                    issue_date: document.issue_date || null,
                    province_id: document.province_id || null,
                    person_id: docPersonId,
                }, { transaction: t });
            } else if (documentType === 'passport') {
                docRecord = await db.passports.create({
                    passport_no: document.passport_no,
                    passport_name: document.passport_name || '',
                    exp_date: document.exp_date,
                    person_id: docPersonId,
                }, { transaction: t });
            }
            console.log(`✅ ② KYC ${documentType} created: id=${docRecord?.id}`);
        }

        // ═══════════════════════════════════════════
        // ③ DEPOSIT ACCOUNT
        // ═══════════════════════════════════════════
        // Fetch product details
        const product = await db.deposit_products.findByPk(productId);
        if (!product) throw new Error('ບໍ່ພົບຜະລິດຕະພັນ');

        // Minimum balance check
        const balance = Number(openingBalance) || 0;
        if (product.minimum_balance && balance > 0 && balance < Number(product.minimum_balance)) {
            throw new Error(`ຍອດເງິນ ${balance.toLocaleString()} ₭ ຕ່ຳກວ່າຂັ້ນຕ່ຳ ${Number(product.minimum_balance).toLocaleString()} ₭`);
        }

        // Generate account number: {prefix}-{YYYY}-{XXXX}
        const mapping = DEPOSIT_ACCOUNT_MAP[productId] || DEPOSIT_ACCOUNT_MAP[1];
        const year = new Date().getFullYear();
        const [seqResult] = await sequelize.query(
            `SELECT COUNT(*) + 1 AS seq FROM deposit_accounts WHERE account_no LIKE :prefix`,
            { replacements: { prefix: `${mapping.prefix}-${year}-%` }, transaction: t }
        );
        const seq = String(seqResult[0].seq).padStart(4, '0');
        const accountNo = `${mapping.prefix}-${year}-${seq}`;

        // Calculate maturity date
        let maturityDate = null;
        const termMonths = product.term_months || 0;
        if (termMonths > 0) {
            const openDate = new Date();
            openDate.setMonth(openDate.getMonth() + termMonths);
            maturityDate = openDate.toISOString().split('T')[0];
        }

        const account = await db.deposit_accounts.create({
            account_no: accountNo,
            product_id: productId,
            currency_id: currencyId || product.currency_id,
            opening_date: new Date().toISOString().split('T')[0],
            account_status: 'ACTIVE',
            current_balance: balance,
            accrued_interest: 0,
            maturity_date: maturityDate,
            deposit_type_id: null, // Will map from product if needed
        }, { transaction: t });
        console.log(`✅ ③ deposit_accounts created: ${accountNo} | balance=${balance}`);

        // ═══════════════════════════════════════════
        // ④ LINK OWNER
        // ═══════════════════════════════════════════
        await db.deposit_account_owners.create({
            account_id: account.id,
            person_id: ownerType === 'individual' ? personId : null,
            enterprise_id: ownerType === 'enterprise' ? enterpriseId : null,
        }, { transaction: t });
        console.log(`✅ ④ owner linked: ${ownerType} id=${personId || enterpriseId}`);

        // ═══════════════════════════════════════════
        // ⑤ OPENING TRANSACTION
        // ═══════════════════════════════════════════
        let txnRecord = null;
        if (balance > 0) {
            txnRecord = await db.deposit_transactions.create({
                account_id: account.id,
                transaction_date: new Date(),
                transaction_type: 'OPENING',
                amount: balance,
                balance_after: balance,
                reference_no: `OPEN-${accountNo}`,
                remarks: 'ຍອດເປີດບັນຊີ',
            }, { transaction: t });
            console.log(`✅ ⑤ OPENING transaction: ${balance}`);
        }

        // ═══════════════════════════════════════════
        // ⑥ JOURNAL ENTRY (Dr Cash / Cr Deposit Liability)
        // ═══════════════════════════════════════════
        let jeRecord = null;
        if (balance > 0) {
            const depositCoaId = mapping.coaId;
            const ownerName = ownerType === 'individual'
                ? (personalInfo?.firstname__la || 'ລູກຄ້າ') + ' ' + (personalInfo?.lastname__la || '')
                : (enterpriseInfo?.name__l_a || 'ວິສາຫະກິດ');
            const refNo = `DEP-${accountNo}`;

            // Resolve actual currency code
            const currency = await db.currencies.findByPk(currencyId || product.currency_id);
            const currCode = currency ? currency.code : 'LAK';
            const exchRate = currCode === 'LAK' ? 1 : 1; // TODO: real exchange rate

            // Default branch
            const defaultBranch = await db.org_branches.findOne({ where: { code: 'HQ' } });
            const branchId = defaultBranch ? String(defaultBranch.id) : null;

            jeRecord = await db.journal_entries.create({
                transaction_date: new Date().toISOString().split('T')[0],
                reference_no: refNo,
                description: `ເປີດບັນຊີເງິນຝາກ: ${ownerName} (${accountNo})`,
                currency_code: currCode,
                exchange_rate: exchRate,
                status: 'POSTED',
                total_debit: balance,
                total_credit: balance,
                source_module: 'DEPOSIT',
                source_id: account.id,
                branch_id: branchId,
                org_code: defaultBranch ? defaultBranch.org_code : null,
            }, { transaction: t });

            // Dr: 11011 ເງິນສົດໃນຄັງ
            await db.journal_entry_lines.create({
                journal_entry_id: jeRecord.id,
                account_id: CASH_COA_ID,
                description: `ຮັບຝາກ - ${ownerName}`,
                debit: balance,
                credit: 0,
                debit_amount_lak: currCode === 'LAK' ? balance : balance * exchRate,
                credit_amount_lak: 0,
                branch_id: branchId,
            }, { transaction: t });

            // Cr: 2131x ເງິນຮັບຝາກ
            await db.journal_entry_lines.create({
                journal_entry_id: jeRecord.id,
                account_id: depositCoaId,
                description: `ຮັບຝາກ - ${ownerName}`,
                debit: 0,
                credit: balance,
                debit_amount_lak: 0,
                credit_amount_lak: currCode === 'LAK' ? balance : balance * exchRate,
                branch_id: branchId,
            }, { transaction: t });

            console.log(`✅ ⑥ JE created: ${refNo} | Dr 11011=${balance} / Cr ${mapping.code}=${balance}`);
        }

        // ═══════════════════════════════════════════
        // ⑦ COMMIT
        // ═══════════════════════════════════════════
        await t.commit();
        console.log(`✅ ⑦ COMMIT — ເປີດບັນຊີ ${accountNo} ສຳເລັດ`);

        res.json({
            status: true,
            message: `ເປີດບັນຊີ ${accountNo} ສຳເລັດ`,
            data: {
                accountId: account.id,
                accountNo,
                personId,
                enterpriseId,
                documentId: docRecord?.id || null,
                transactionId: txnRecord?.id || null,
                journalEntryId: jeRecord?.id || null,
                maturityDate,
                interestRate: product.interest_rate,
            },
        });
    } catch (err) {
        await t.rollback();
        console.error('❌ Deposit process error:', err.message);
        res.status(500).json({
            status: false,
            message: 'ເກີດຂໍ້ຜິດພາດໃນການເປີດບັນຊີ',
            error: err.message,
        });
    }
});

module.exports = router;
