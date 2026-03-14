/**
 * Borrower Service — Enterprise Transaction Logic
 * ═══════════════════════════════════════════════════
 * Single transaction for full borrower creation:
 * personal_info → documents → loan_contracts → collaterals →
 * installment_schedules → journal_entries → borrowers_individual
 *
 * If ANY step fails → ALL tables rollback
 */
const logger = require('../config/logger');
const db = require('../models');
const { generateSchedule } = require('./generateSchedule');

// ── Auto-ID Generator (same logic as autoid.routes.js)
function generateCode(tableName) {
    const prefix = tableName.toUpperCase().slice(0, 5);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    return `${prefix}-${dateStr}-${rand}`;
}

/**
 * parseDateForDB — Convert DD/MM/YYYY to YYYY-MM-DD for Postgres
 */
function parseDateForDB(dateStr) {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
        const [dd, mm, yyyy] = dateStr.split('/');
        return `${yyyy}-${mm}-${dd}`;
    }
    return dateStr;
}

/**
 * sanitizeString — Strip HTML/XSS tags from input
 */
function sanitizeString(val) {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').trim();
}

/**
 * sanitizeObject — Recursively sanitize all string values
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            clean[k] = sanitizeObject(v);
        } else {
            clean[k] = sanitizeString(v);
        }
    }
    return clean;
}

/**
 * createFullBorrower — Single transaction INSERT to 8+ tables
 * @param {Object} data - { personal, document, loan, collateral }
 * @returns {Object} { success, person_id, loan_id, collateral_id, schedule_count, journal_entry_id }
 */
async function createFullBorrower(data) {
    // ── XSS Sanitize all input ──
    data = sanitizeObject(data);

    const t = await db.sequelize.transaction();

    try {
        const { personal = {}, document = {}, loan = {}, collateral = {} } = data;

        // ═══════════════════════════════════════════
        // ① INSERT personal_info
        // ═══════════════════════════════════════════
        const personCode = generateCode('PERSO');
        const person = await db.personal_info.create({
            personal_code: personCode,
            firstname__la: personal.firstname__la,
            lastname__la: personal.lastname__la,
            firstname__en: personal.firstname__en || null,
            lastname__en: personal.lastname__en || null,
            dateofbirth: parseDateForDB(personal.dateofbirth) || null,
            gender_id: personal.gender_id || null,
            nationality_id: personal.nationality_id || null,
            marital_status_id: personal.marital_status_id || null,
            career_id: personal.career_id || null,
            village_id: personal.village_id || null,
            home_address: personal.home_address || null,
            contact_info: personal.contact_info || null,
            mobile_no: personal.mobile_no || null,
            telephone_no: personal.telephone_no || null,
        }, { transaction: t });

        // ═══════════════════════════════════════════
        // ② INSERT Document (conditional by type)
        // ═══════════════════════════════════════════
        let doc_record = null;
        const docType = document.type; // 'id_card' | 'family_book' | 'passport'

        if (docType === 'id_card' && document.card_no) {
            doc_record = await db.lao_id_cards.create({
                card_no: document.card_no,
                card_name: document.card_name || null,
                date_of_issue: parseDateForDB(document.date_of_issue) || null,
                exp_date: parseDateForDB(document.exp_date) || null,
                person_id: person.id,
            }, { transaction: t });
        } else if (docType === 'family_book' && document.book_no) {
            doc_record = await db.family_books.create({
                book_no: document.book_no,
                book_name: document.book_name || null,
                issue_date: parseDateForDB(document.date_of_issue) || null,
                province_id: document.village_id || null,
                person_id: person.id,
            }, { transaction: t });
        } else if (docType === 'passport' && document.passport_no) {
            doc_record = await db.passports.create({
                passport_no: document.passport_no,
                passport_name: document.passport_name || '-',
                exp_date: parseDateForDB(document.exp_date) || new Date().toISOString().split('T')[0],
                person_id: person.id,
            }, { transaction: t });
        }

        // ═══════════════════════════════════════════
        // ③ INSERT loan_contracts
        // ═══════════════════════════════════════════
        let loan_record = null;
        if (loan.approved_amount || loan.contract_no) {
            const loanCode = loan.contract_no || generateCode('LOAN');
            loan_record = await db.loan_contracts.create({
                id: undefined, // auto-increment
                contract_no: loanCode,
                approved_amount: loan.approved_amount || 0,
                remaining_balance: loan.remaining_balance || loan.approved_amount || 0,
                allowance_losses: loan.allowance_losses || 0,
                interest_rate: loan.interest_rate || 0,
                term_months: loan.term_months || 0,
                disbursement_date: parseDateForDB(loan.disbursement_date),
                maturity_date: parseDateForDB(loan.maturity_date),
                use_of_loan: loan.use_of_loan || null,
                funding_org: loan.funding_org || null,
                classification_id: loan.classification_id || null,
                classification_date: parseDateForDB(loan.classification_date),
                loan_type_id: loan.loan_type_id || null,
                loan_term_id: loan.loan_term_id || null,
                borrower_type_id: loan.borrower_type_id || null,
                economic_sector_id: loan.economic_sector_id || null,
                economic_branch_id: loan.economic_branch_id || null,
                borrower_connection_id: loan.borrower_connection_id || null,
                funding_source_id: loan.funding_source_id || null,
                loan_purpose_id: loan.loan_purpose_id || null,
                currency_id: loan.currency_id || null,
                restructured_date: parseDateForDB(loan.restructured_date),
                write_off_date: parseDateForDB(loan.write_off_date),
            }, { transaction: t });
        }

        // ═══════════════════════════════════════════
        // ④ INSERT collaterals + link tables
        // ═══════════════════════════════════════════
        let col_record = null;
        if (collateral.name || collateral.collateral_no) {
            const colCode = collateral.collateral_no || generateCode('COLLA');
            col_record = await db.collaterals.create({
                name: collateral.name || '',
                collateral_no: colCode,
                collateral_type_id: collateral.collateral_type_id || collateral.category_id || 1,
                category_id: collateral.category_id || 1,
                date_of_issue: collateral.date_of_issue || new Date().toISOString().split('T')[0],
                value: collateral.value || 0,
                currency_id: collateral.currency_id || null,
                other_details: collateral.other_details || '',
            }, { transaction: t });

            // Link: collateral_individuals
            await db.collateral_individuals.create({
                collateral_id: col_record.id,
                person_id: person.id,
            }, { transaction: t });

            // Link: loan_collaterals
            if (loan_record) {
                await db.loan_collaterals.create({
                    collateral_id: col_record.id,
                    loan_id: loan_record.id,
                }, { transaction: t });
            }
        }

        // ═══════════════════════════════════════════
        // ⑥ GENERATE + INSERT loan_repayment_schedules
        // ═══════════════════════════════════════════
        let scheduleCount = 0;
        if (loan_record && loan_record.id) {
            const amount = Number(String(loan.approved_amount || 0).replace(/,/g, '')) || 0;
            const termM = Number(String(loan.term_months || 0).replace(/,/g, '')) || 0;
            const intRate = Number(String(loan.interest_rate || 0).replace(/,/g, '')) || 0;

            if (amount > 0 && termM > 0) {
                const { rows } = generateSchedule({
                    principal: amount,
                    rate: intRate,
                    months: termM,
                    type: loan.loan_type_id || null,
                    from_date: loan.disbursement_date || null,
                });

                // Bulk insert into existing loan_repayment_schedules table
                if (rows.length > 0) {
                    const scheduleRows = rows.map(r => ({
                        contract_id: loan_record.id,
                        installment_no: r.installment_no,
                        due_date: r.due_date,
                        principal_due: r.principal_amount,
                        interest_due: r.interest_amount,
                        total_amount: r.total_amount,
                        status: 'SCHEDULED',
                        is_paid: false,
                    }));
                    await db.loan_repayment_schedules.bulkCreate(scheduleRows, { transaction: t });
                    scheduleCount = rows.length;
                    logger.info(`✅ Created ${scheduleCount} repayment schedule rows`);
                }
            }
        }

        // ═══════════════════════════════════════════
        // ⑦ CREATE Journal Entry (Dr Loans / Cr Cash)
        // ═══════════════════════════════════════════
        let je_record = null;
        if (loan_record && loan_record.id) {
            const loanAmount = Number(String(loan.approved_amount || 0).replace(/,/g, '')) || 0;

            if (loanAmount > 0) {
                // Lookup account IDs from chart_of_accounts
                const loanAccount = await db.chart_of_accounts.findOne({
                    where: { account_code: '1110' },
                    attributes: ['id'],
                    raw: true,
                });
                const cashAccount = await db.chart_of_accounts.findOne({
                    where: { account_code: '1010' },
                    attributes: ['id'],
                    raw: true,
                });

                // Use found IDs or fallback
                const loanAccId = loanAccount?.id || 1;
                const cashAccId = cashAccount?.id || 2;

                const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
                const refNo = `LOAN-DIS-${loan_record.id}-${rand}`;
                const txDate = parseDateForDB(loan.disbursement_date) || new Date().toISOString().split('T')[0];
                const borrowerName = `${personal.firstname__la || ''} ${personal.lastname__la || ''}`.trim();

                je_record = await db.journal_entries.create({
                    transaction_date: txDate,
                    reference_no: refNo,
                    description: `ປ່ອຍກູ້ລູກຄ້າ: ${borrowerName}`,
                    currency_code: 'LAK',
                    exchange_rate: 1,
                    status: 'POSTED',
                    total_debit: loanAmount,
                    total_credit: loanAmount,
                    source_module: 'LOAN',
                    source_id: loan_record.id,
                }, { transaction: t });

                // Dr: 1110 ເງິນໃຫ້ກູ້ (Loans Receivable)
                await db.journal_entry_lines.create({
                    journal_entry_id: je_record.id,
                    account_id: loanAccId,
                    description: `ປ່ອຍກູ້ - ${borrowerName}`,
                    debit: loanAmount,
                    credit: 0,
                    debit_amount_lak: loanAmount,
                    credit_amount_lak: 0,
                }, { transaction: t });

                // Cr: 1010 ເງິນສົດ (Cash)
                await db.journal_entry_lines.create({
                    journal_entry_id: je_record.id,
                    account_id: cashAccId,
                    description: `ປ່ອຍກູ້ - ${borrowerName}`,
                    debit: 0,
                    credit: loanAmount,
                    debit_amount_lak: 0,
                    credit_amount_lak: loanAmount,
                }, { transaction: t });

                logger.info(`✅ Journal Entry created: ${refNo} | Dr/Cr: ${loanAmount}`);
            }
        }

        // ═══════════════════════════════════════════
        // ⑧ INSERT borrowers_individual (denormalized snapshot)
        // ═══════════════════════════════════════════
        const borrower = await db.borrowers_individual.create({
            personal_info_id: person.id,
            borrower_id: person.id,
            loan_id: loan_record?.id || null,
            firstname__l_a: personal.firstname__la,
            lastname__l_a: personal.lastname__la,
            firstname__e_n: personal.firstname__en || null,
            lastname__e_n: personal.lastname__en || null,
            firstname_la: personal.firstname__la,
            lastname_la: personal.lastname__la,
            firstname_en: personal.firstname__en || null,
            lastname_en: personal.lastname__en || null,
            dateofbirth: personal.dateofbirth || null,
            gender_id: personal.gender_id || null,
            nationality_id: personal.nationality_id || null,
            marital_status_id: personal.marital_status_id || null,
            career_id: personal.career_id || null,
            village_id: personal.village_id || null,
            home_address: personal.home_address || null,
            mobile_no: personal.mobile_no || null,
            telephone_no: personal.telephone_no || null,
            // document IDs
            card_id: (docType === 'id_card' && doc_record) ? doc_record.id : null,
            card_no: document?.card_no || null,
            card_name: document?.card_name || null,
            book_id: (docType === 'family_book' && doc_record) ? doc_record.id : null,
            book_no: document?.book_no || null,
            passport_id: (docType === 'passport' && doc_record) ? doc_record.id : null,
            passport_no: document?.passport_no || null,
        }, { transaction: t });

        // ═══════════════════════════════════════════
        // COMMIT — ທຸກ table ສຳເລັດ
        // ═══════════════════════════════════════════
        await t.commit();

        return {
            success: true,
            message: 'ປ່ອຍກູ້ລູກຄ້າໃໝ່ສຳເລັດ',
            data: {
                person_id: person.id,
                person_code: personCode,
                doc_id: doc_record?.id || null,
                loan_id: loan_record?.id || null,
                collateral_id: col_record?.id || null,
                borrower_id: borrower.id,
                schedule_count: scheduleCount,
                journal_entry_id: je_record?.id || null,
            },
        };
    } catch (err) {
        // ═══════════════════════════════════════════
        // ROLLBACK — ລ້າງທຸກ table ອັດຕະໂນມັດ
        // ═══════════════════════════════════════════
        await t.rollback();
        throw err;
    }
}

module.exports = {
    createFullBorrower,
};

