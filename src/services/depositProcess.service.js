/**
 * depositProcess.service.js — ເປີດບັນຊີເງິນຝາກ (7-step transaction)
 */
const logger = require('../config/logger');
const db = require('../models');
const sequelize = db.sequelize;

const DEPOSIT_ACCOUNT_MAP = {
    1: { coaId: 1008, code: '213113', name: 'ເງິນຝາກປະຢັດ', prefix: 'S' },
    2: { coaId: 1010, code: '213115', name: 'ເງິນຝາກມີກຳນົດ', prefix: 'F' },
    3: { coaId: 1010, code: '213115', name: 'ເງິນຝາກມີກຳນົດ', prefix: 'F' },
    4: { coaId: 1007, code: '213111', name: 'ເງິນຝາກກະແສລາຍວັນ', prefix: 'C' },
};
const CASH_COA_ID = 3;

class DepositProcessService {
    static async getProducts() {
        return { status: true, data: await db.deposit_products.findAll({ order: [['id', 'ASC']] }) };
    }

    static async getAccounts() {
        const [rows] = await sequelize.query('SELECT * FROM v_deposit_accounts');
        return { status: true, data: rows };
    }

    static async openAccount(body) {
        const { ownerType, personalInfo, enterpriseInfo, existingPersonId, existingEnterpriseId, productId, currencyId, openingBalance, documentType, document } = body;
        let personId = existingPersonId || null, enterpriseId = existingEnterpriseId || null;
        const t = await sequelize.transaction();
        try {
            // ⓪ AML Validation
            if (ownerType === 'individual' && !documentType) throw new Error('ກະລຸນາເລືອກເອກະສານ KYC ຕາມກົດໝາຍ AML ມາດຕາ 16');

            // ① Owner
            if (ownerType === 'individual' && !personId && personalInfo) {
                const person = await db.personal_info.create({ firstname__la: personalInfo.firstname__la, lastname__la: personalInfo.lastname__la, firstname__en: personalInfo.firstname__en || null, lastname__en: personalInfo.lastname__en || null, dateofbirth: personalInfo.dateofbirth || null, gender_id: personalInfo.gender_id, career_id: personalInfo.career_id, marital_status_id: personalInfo.marital_status_id, nationality_id: personalInfo.nationality_id, village_id: personalInfo.village_id, mobile_no: personalInfo.mobile_no || null, telephone_no: personalInfo.telephone_no || null, home_address: personalInfo.home_address || null }, { transaction: t });
                personId = person.id;
            }
            if (ownerType === 'enterprise' && !enterpriseId && enterpriseInfo) {
                const [eiResult] = await sequelize.query(`INSERT INTO enterprise_info ("name__l_a", "name__e_n", register_no, registrant, enterprise_type_id, enterprise_size_id, village_id, tax_no, mobile_no) VALUES (:name_la, :name_en, :reg_no, :registrant, :type_id, :size_id, :village_id, :tax_no, :mobile) RETURNING id`, { replacements: { name_la: enterpriseInfo.name__l_a, name_en: enterpriseInfo.name__e_n || '', reg_no: enterpriseInfo.register_no, registrant: enterpriseInfo.registrant || '', type_id: enterpriseInfo.enterprise_type_id || null, size_id: enterpriseInfo.enterprise_size_id || null, village_id: enterpriseInfo.village_id || null, tax_no: enterpriseInfo.tax_no || null, mobile: enterpriseInfo.mobile_no || null }, transaction: t });
                enterpriseId = eiResult[0].id;
            }

            // ② KYC
            let docRecord = null;
            if (documentType && document && personId) {
                if (documentType === 'id_card') docRecord = await db.lao_id_cards.create({ card_no: document.card_no, card_name: document.card_name || null, date_of_issue: document.date_of_issue || null, exp_date: document.exp_date || null, person_id: personId }, { transaction: t });
                else if (documentType === 'family_book') docRecord = await db.family_books.create({ book_no: document.book_no, book_name: document.book_name || null, issue_date: document.issue_date || null, province_id: document.province_id || null, person_id: personId }, { transaction: t });
                else if (documentType === 'passport') docRecord = await db.passports.create({ passport_no: document.passport_no, passport_name: document.passport_name || '', exp_date: document.exp_date, person_id: personId }, { transaction: t });
            }

            // ③ Account
            const product = await db.deposit_products.findByPk(productId);
            if (!product) throw new Error('ບໍ່ພົບຜະລິດຕະພັນ');
            const balance = Number(openingBalance) || 0;
            if (product.minimum_balance && balance > 0 && balance < Number(product.minimum_balance)) throw new Error(`ຍອດເງິນ ${balance.toLocaleString()} ₭ ຕ່ຳກວ່າຂັ້ນຕ່ຳ ${Number(product.minimum_balance).toLocaleString()} ₭`);
            const mapping = DEPOSIT_ACCOUNT_MAP[productId] || DEPOSIT_ACCOUNT_MAP[1];
            const year = new Date().getFullYear();
            const [seqResult] = await sequelize.query(`SELECT COUNT(*)+1 AS seq FROM deposit_accounts WHERE account_no LIKE :prefix`, { replacements: { prefix: `${mapping.prefix}-${year}-%` }, transaction: t });
            const accountNo = `${mapping.prefix}-${year}-${String(seqResult[0].seq).padStart(4, '0')}`;
            let maturityDate = null;
            if (product.term_months > 0) { const d = new Date(); d.setMonth(d.getMonth() + product.term_months); maturityDate = d.toISOString().split('T')[0]; }
            const account = await db.deposit_accounts.create({ account_no: accountNo, product_id: productId, currency_id: currencyId || product.currency_id, opening_date: new Date().toISOString().split('T')[0], account_status: 'ACTIVE', current_balance: balance, accrued_interest: 0, maturity_date: maturityDate, deposit_type_id: null }, { transaction: t });

            // ④ Owner Link
            await db.deposit_account_owners.create({ account_id: account.id, person_id: ownerType === 'individual' ? personId : null, enterprise_id: ownerType === 'enterprise' ? enterpriseId : null }, { transaction: t });

            // ⑤ Opening Transaction
            let txnRecord = null;
            if (balance > 0) txnRecord = await db.deposit_transactions.create({ account_id: account.id, transaction_date: new Date(), transaction_type: 'OPENING', amount: balance, balance_after: balance, reference_no: `OPEN-${accountNo}`, remarks: 'ຍອດເປີດບັນຊີ' }, { transaction: t });

            // ⑥ Journal Entry
            let jeRecord = null;
            if (balance > 0) {
                const ownerName = ownerType === 'individual' ? (personalInfo?.firstname__la || 'ລູກຄ້າ') + ' ' + (personalInfo?.lastname__la || '') : (enterpriseInfo?.name__l_a || 'ວິສາຫະກິດ');
                const currency = await db.currencies.findByPk(currencyId || product.currency_id);
                const currCode = currency ? currency.code : 'LAK';
                const defaultBranch = await db.org_branches.findOne({ where: { code: 'HQ' } });
                const branchId = defaultBranch ? String(defaultBranch.id) : null;
                jeRecord = await db.journal_entries.create({ transaction_date: new Date().toISOString().split('T')[0], reference_no: `DEP-${accountNo}`, description: `ເປີດບັນຊີ: ${ownerName} (${accountNo})`, currency_code: currCode, exchange_rate: 1, status: 'POSTED', total_debit: balance, total_credit: balance, source_module: 'DEPOSIT', source_id: account.id, branch_id: branchId, org_code: defaultBranch ? defaultBranch.org_code : null }, { transaction: t });
                await db.journal_entry_lines.create({ journal_entry_id: jeRecord.id, account_id: CASH_COA_ID, description: `ຮັບຝາກ - ${ownerName}`, debit: balance, credit: 0, debit_amount_lak: balance, credit_amount_lak: 0, branch_id: branchId }, { transaction: t });
                await db.journal_entry_lines.create({ journal_entry_id: jeRecord.id, account_id: mapping.coaId, description: `ຮັບຝາກ - ${ownerName}`, debit: 0, credit: balance, debit_amount_lak: 0, credit_amount_lak: balance, branch_id: branchId }, { transaction: t });
            }

            // ⑦ Commit
            await t.commit();
            return { status: true, message: `ເປີດບັນຊີ ${accountNo} ສຳເລັດ`, data: { accountId: account.id, accountNo, personId, enterpriseId, documentId: docRecord?.id || null, transactionId: txnRecord?.id || null, journalEntryId: jeRecord?.id || null, maturityDate, interestRate: product.interest_rate } };
        } catch (err) { await t.rollback(); throw err; }
    }
}

module.exports = DepositProcessService;
