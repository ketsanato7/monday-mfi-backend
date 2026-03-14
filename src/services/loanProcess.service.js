/**
 * loanProcess.service.js — Centralized Business Logic for Loan Lifecycle
 *
 * Controller → Service → Repository pattern
 * ທຸກ raw SQL + business logic ຢູ່ນີ້ — routes ເປັນ thin controller ເທົ່ານັ້ນ
 */
const db = require('../models');
const sequelize = db.sequelize;
const bol = require('../middleware/bol-compliance');

// ═══════════════════════════════════════════
// BoL Classification Rules (static config)
// ═══════════════════════════════════════════
const BOL_CLASSIFICATION_RULES = [
    { code: 'A', classId: 1, maxDays: 30, rate: 0.01 },
    { code: 'B', classId: 2, maxDays: 60, rate: 0.03 },
    { code: 'C', classId: 3, maxDays: 90, rate: 0.20 },
    { code: 'D', classId: 4, maxDays: 180, rate: 0.50 },
    { code: 'E', classId: 5, maxDays: 99999, rate: 1.00 },
];

function getClassification(daysOverdue) {
    for (const rule of BOL_CLASSIFICATION_RULES) {
        if (daysOverdue <= rule.maxDays) return rule;
    }
    return BOL_CLASSIFICATION_RULES[4];
}

class LoanProcessService {
    // ─────────────────────────────────────────
    // ① Loan Origination (existing)
    // ─────────────────────────────────────────
    static async processOrigination(payload, externalTransaction = null) {
        const t = externalTransaction || await sequelize.transaction();

        try {
            const {
                borrowerType, personalInfo, enterpriseInfo, groupMembers,
                documents, loanContract, collaterals, fees, insurances,
                existingPersonId, existingEnterpriseId,
            } = payload;

            let personId = existingPersonId || null;
            let enterpriseId = existingEnterpriseId || null;

            // 1. Create or Find Borrower Info
            if (borrowerType === 'individual' && !personId && personalInfo) {
                const pi = await db.personal_info.create({
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
                    personal_code: personalInfo.personal_code || null,
                    phone_number: personalInfo.phone_number || null,
                    spouse_firstname: personalInfo.spouse_firstname || null,
                    spouse_lastname: personalInfo.spouse_lastname || null,
                    spouse_career_id: personalInfo.spouse_career_id || null,
                    spouse_mobile_number: personalInfo.spouse_mobile_number || null,
                    total_family_members: personalInfo.total_family_members || null,
                    females: personalInfo.females || null,
                }, { transaction: t });
                personId = pi.id;
            }

            if (borrowerType === 'enterprise' && !enterpriseId && enterpriseInfo) {
                const ei = await db.enterprise_info.create({
                    name__l_a: enterpriseInfo.name__l_a,
                    name__e_n: enterpriseInfo.name__e_n || null,
                    register_no: enterpriseInfo.register_no,
                    registrant: enterpriseInfo.registrant || '',
                    enterprise_type_id: enterpriseInfo.enterprise_type_id || null,
                    enterprise_size_id: enterpriseInfo.enterprise_size_id || null,
                    village_id: enterpriseInfo.village_id || null,
                    tax_no: enterpriseInfo.tax_no || null,
                    mobile_no: enterpriseInfo.mobile_no || null,
                }, { transaction: t });
                enterpriseId = ei.id;
            }

            // 2. Save Identity Documents
            if (personId && documents) {
                if (documents.idCard) {
                    await db.lao_id_cards.create({
                        card_no: documents.idCard.card_no,
                        card_name: documents.idCard.card_name,
                        date_of_issue: documents.idCard.date_of_issue,
                        exp_date: documents.idCard.exp_date,
                        person_id: personId,
                    }, { transaction: t });
                }
                if (documents.familyBook) {
                    await db.family_books.create({
                        book_no: documents.familyBook.book_no,
                        book_name: documents.familyBook.book_name,
                        province_id: documents.familyBook.province_id,
                        issue_date: documents.familyBook.issue_date,
                        person_id: personId,
                    }, { transaction: t });
                }
                if (documents.passport) {
                    await db.passports.create({
                        passport_no: documents.passport.passport_no,
                        passport_name: documents.passport.passport_name,
                        exp_date: documents.passport.exp_date,
                        person_id: personId,
                    }, { transaction: t });
                }
            }

            // 3. Create Loan Contract
            const lc = await db.loan_contracts.create({
                contract_no: loanContract.contract_no || `LC-${Date.now()}`,
                product_id: loanContract.product_id,
                currency_id: loanContract.currency_id,
                approved_amount: loanContract.approved_amount,
                interest_rate: loanContract.interest_rate,
                term_months: loanContract.term_months,
                loan_term_id: loanContract.loan_term_id || null,
                disbursement_date: loanContract.disbursement_date || null,
                maturity_date: loanContract.maturity_date || null,
                loan_type_id: loanContract.loan_type_id || null,
                loan_purpose_id: loanContract.loan_purpose_id || null,
                economic_sector_id: loanContract.economic_sector_id || null,
                economic_branch_id: loanContract.economic_branch_id || null,
                funding_source_id: loanContract.funding_source_id || null,
                classification_id: loanContract.classification_id || null,
                borrower_connection_id: loanContract.borrower_connection_id || null,
                borrower_type_id: loanContract.borrower_type_id || null,
                use_of_loan: loanContract.use_of_loan || null,
                allowance_losses: Math.round((loanContract.approved_amount || 0) * 0.01),
                loan_status: 'PENDING',
                remaining_balance: loanContract.approved_amount,
            }, { transaction: t });
            const loanId = lc.id;

            // 4. Link Borrowers to Loan
            if (borrowerType === 'individual' && personId) {
                await db.borrowers_individual.create({
                    borrower_id: personId, loan_id: loanId, personal_info_id: personId,
                }, { transaction: t });
            } else if (borrowerType === 'enterprise' && enterpriseId) {
                await db.borrowers_enterprise.create({
                    enterprise_id: enterpriseId, loan_id: loanId,
                }, { transaction: t });
            } else if (borrowerType === 'group' && groupMembers?.length > 0) {
                const groupRecords = groupMembers.map(memberId => ({
                    borrower_id: memberId, loan_id: loanId, personal_info_id: memberId,
                }));
                await db.borrowers_individual.bulkCreate(groupRecords, { transaction: t });
            }

            // 5. Add Collaterals
            if (collaterals?.length > 0) {
                for (const col of collaterals) {
                    const createdCol = await db.collaterals.create({
                        category_id: col.category_id, name: col.name,
                        collateral_no: col.collateral_no || '',
                        date_of_issue: col.date_of_issue || new Date().toISOString().split('T')[0],
                        value: col.value || '0', other_details: col.other_details || '',
                    }, { transaction: t });
                    await db.loan_collaterals.create({
                        collateral_id: createdCol.id, loan_id: loanId,
                    }, { transaction: t });
                }
            }

            // 6. Add Fees
            if (fees?.length > 0) {
                const feeRecords = fees.map(fee => ({
                    loan_id: loanId, fee_type: fee.fee_type, fee_amount: fee.fee_amount,
                    deducted_from_loan: fee.deducted_from_loan ?? false, notes: fee.notes || '',
                }));
                await db.loan_fees.bulkCreate(feeRecords, { transaction: t });
            }

            // 7. Add Insurance
            if (insurances?.length > 0) {
                const insRecords = insurances.map(ins => ({
                    loan_id: loanId, insurance_type: ins.insurance_type, premium: ins.premium,
                    coverage_amount: ins.coverage_amount || 0, start_date: ins.start_date || null,
                    end_date: ins.end_date || null, beneficiary: ins.beneficiary || '', notes: ins.notes || '',
                }));
                await db.loan_insurance.bulkCreate(insRecords, { transaction: t });
            }

            if (!externalTransaction) await t.commit();
            return { status: true, message: 'ບັນ ທຶກ ສຳ ເລັດ', data: { loanId, personId, enterpriseId } };
        } catch (error) {
            if (!externalTransaction && t && !t.finished) await t.rollback();
            throw error;
        }
    }

    // ─────────────────────────────────────────
    // ② Get Pending Loans
    // ─────────────────────────────────────────
    static async getPending() {
        const [rows] = await sequelize.query(`
            SELECT lc.*, lp.value as product_name, c.code as currency_code
            FROM loan_contracts lc
            LEFT JOIN loan_products lp ON lc.product_id = lp.id
            LEFT JOIN currencies c ON lc.currency_id = c.id
            WHERE lc.loan_status = 'PENDING'
            ORDER BY lc.created_at DESC
        `);
        return rows;
    }

    // ─────────────────────────────────────────
    // ③ Approve Loan (BoL compliant)
    // ─────────────────────────────────────────
    static async approve(loanId, user) {
        const [loans] = await sequelize.query(
            `SELECT lc.approved_amount, lc.borrower_type_id, bi.personal_info_id
             FROM loan_contracts lc
             LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
             WHERE lc.id = :id`,
            { replacements: { id: loanId } }
        );
        if (!loans.length) throw Object.assign(new Error('ບໍ່ ພົບ ສັນ ຍາ'), { statusCode: 404 });
        const loan = loans[0];
        const amount = parseFloat(loan.approved_amount);

        // ① BoL Ceiling ≤50M ₭
        const ceiling = bol.validateLoanCeiling(amount);
        if (!ceiling.valid) throw Object.assign(new Error(ceiling.message), { statusCode: 400, ...ceiling });

        // ② Role-based approval limit
        const roleId = user?.roleId || user?.role_id || 2;
        const roleLimit = await bol.validateApprovalLimit(amount, roleId);
        if (!roleLimit.valid) throw Object.assign(new Error(roleLimit.message), { statusCode: 403, ...roleLimit });

        // ③ Blacklist check
        if (loan.personal_info_id) {
            const bl = await bol.checkBlacklist(loan.personal_info_id);
            if (bl.blocked) throw Object.assign(new Error(bl.reason), { statusCode: 403, code: bl.code });
        }

        await sequelize.query(
            `UPDATE loan_contracts SET loan_status = 'APPROVED', updated_at = NOW() WHERE id = :id`,
            { replacements: { id: loanId } }
        );

        return { status: true, message: 'ອະ ນຸ ມັດ ແລ້ວ (BoL compliant)', bolChecks: { ceiling, roleLimit } };
    }

    // ─────────────────────────────────────────
    // ④ Reject Loan
    // ─────────────────────────────────────────
    static async reject(loanId) {
        await sequelize.query(
            `UPDATE loan_contracts SET loan_status = 'REJECTED', updated_at = NOW() WHERE id = :id`,
            { replacements: { id: loanId } }
        );
        return { status: true, message: 'ປະ ຕິ ເສດ ແລ້ວ' };
    }

    // ─────────────────────────────────────────
    // ⑤ Get Pipeline (status counts + recent)
    // ─────────────────────────────────────────
    static async getPipeline() {
        const counts = await sequelize.query(`
            SELECT loan_status, COUNT(*) as count
            FROM loan_contracts
            GROUP BY loan_status ORDER BY loan_status
        `, { type: sequelize.QueryTypes.SELECT });

        const recent = await sequelize.query(`
            SELECT DISTINCT ON (lc.id)
                   lc.id, lc.contract_no, lc.loan_status, lc.approved_amount,
                   lc.interest_rate, lc.term_months, lc.created_at,
                   pi.firstname__la || ' ' || pi.lastname__la AS borrower_name,
                   lp.product_name_la AS product_name,
                   c.code AS currency
            FROM loan_contracts lc
            LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
            LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
            LEFT JOIN loan_products lp ON lp.id = lc.product_id
            LEFT JOIN currencies c ON c.id = lc.currency_id
            ORDER BY lc.id DESC
        `, { type: sequelize.QueryTypes.SELECT });

        return {
            status: true,
            pipeline: {
                counts: counts.reduce((acc, c) => { acc[c.loan_status] = parseInt(c.count); return acc; }, {}),
                recent,
            },
        };
    }

    // ─────────────────────────────────────────
    // ⑥ Dashboard (comprehensive analytics)
    // ─────────────────────────────────────────
    static async getDashboard() {
        const [statusCounts] = await sequelize.query(`
            SELECT loan_status, COUNT(*) as count,
                   COALESCE(SUM(approved_amount), 0) as total_amount
            FROM loan_contracts WHERE deleted_at IS NULL
            GROUP BY loan_status ORDER BY loan_status
        `);

        const [dpdBuckets] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE days_past_due = 0 OR days_past_due IS NULL) as current_loans,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 1 AND 3) as bucket_1_3,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 4 AND 15) as bucket_4_15,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 16 AND 30) as bucket_16_30,
                COUNT(*) FILTER (WHERE days_past_due BETWEEN 31 AND 90) as bucket_31_90,
                COUNT(*) FILTER (WHERE days_past_due > 90) as bucket_90_plus,
                COALESCE(SUM(remaining_balance) FILTER (WHERE days_past_due > 30), 0) as par30_amount,
                COALESCE(SUM(remaining_balance) FILTER (WHERE days_past_due > 90), 0) as par90_amount,
                COALESCE(SUM(remaining_balance), 0) as total_portfolio
            FROM loan_contracts
            WHERE loan_status IN ('ACTIVE','DISBURSED') AND deleted_at IS NULL
        `);

        const [financials] = await sequelize.query(`
            SELECT
                COUNT(*) as total_contracts,
                COALESCE(SUM(approved_amount), 0) as total_disbursed,
                COALESCE(SUM(remaining_balance), 0) as total_outstanding,
                COALESCE(SUM(approved_amount) - SUM(remaining_balance), 0) as total_collected,
                COALESCE(AVG(interest_rate), 0) as avg_interest_rate,
                COALESCE(AVG(term_months), 0) as avg_term_months
            FROM loan_contracts
            WHERE loan_status IN ('ACTIVE','DISBURSED','COMPLETED') AND deleted_at IS NULL
        `);

        const [monthlyTrend] = await sequelize.query(`
            SELECT TO_CHAR(disbursement_date, 'YYYY-MM') as month,
                   COUNT(*) as count,
                   COALESCE(SUM(approved_amount), 0) as amount
            FROM loan_contracts
            WHERE disbursement_date IS NOT NULL
            AND disbursement_date >= NOW() - INTERVAL '6 months'
            AND deleted_at IS NULL
            GROUP BY TO_CHAR(disbursement_date, 'YYYY-MM')
            ORDER BY month
        `);

        const [recentActions] = await sequelize.query(`
            SELECT DISTINCT ON (lc.id) lc.id, lc.contract_no, lc.loan_status as action,
                    lc.approved_amount as amount,
                    pi.firstname__la || ' ' || pi.lastname__la as borrower_name,
                    lc.updated_at as action_date
             FROM loan_contracts lc
             LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
             LEFT JOIN personal_info pi ON pi.id = bi.personal_info_id
             WHERE lc.deleted_at IS NULL
             ORDER BY lc.id DESC, lc.updated_at DESC LIMIT 10
        `);

        const [pendingCount] = await sequelize.query(`
            SELECT COUNT(*) as count FROM loan_contracts
            WHERE loan_status IN ('PENDING','SUBMITTED') AND deleted_at IS NULL
        `);

        const [classDistribution] = await sequelize.query(`
            SELECT 
                COALESCE(lc2.value, 'ບໍ່ ລະ ບຸ') as classification_name,
                lc.classification_id,
                COUNT(*) as count,
                COALESCE(SUM(lc.remaining_balance), 0) as amount
            FROM loan_contracts lc
            LEFT JOIN loan_classifications lc2 ON lc2.id = lc.classification_id
            WHERE lc.loan_status IN ('ACTIVE','DISBURSED') AND lc.deleted_at IS NULL
            GROUP BY lc.classification_id, lc2.value
            ORDER BY lc.classification_id
        `);

        const dpd = dpdBuckets[0] || {};
        const totalPortfolio = parseFloat(dpd.total_portfolio) || 1;

        return {
            status: true,
            data: {
                pipeline: statusCounts.reduce((acc, s) => {
                    acc[s.loan_status] = { count: parseInt(s.count), amount: parseFloat(s.total_amount) };
                    return acc;
                }, {}),
                dpd: {
                    current: parseInt(dpd.current_loans) || 0,
                    bucket_1_3: parseInt(dpd.bucket_1_3) || 0,
                    bucket_4_15: parseInt(dpd.bucket_4_15) || 0,
                    bucket_16_30: parseInt(dpd.bucket_16_30) || 0,
                    bucket_31_90: parseInt(dpd.bucket_31_90) || 0,
                    bucket_90_plus: parseInt(dpd.bucket_90_plus) || 0,
                    par30: ((parseFloat(dpd.par30_amount) / totalPortfolio) * 100).toFixed(2),
                    par90: ((parseFloat(dpd.par90_amount) / totalPortfolio) * 100).toFixed(2),
                },
                financials: financials[0],
                monthlyTrend,
                recentActions,
                pendingApprovals: parseInt(pendingCount[0]?.count) || 0,
                classification: classDistribution,
            },
        };
    }

    // ─────────────────────────────────────────
    // ⑦ Auto Classify (BoL Decree 184/G)
    // ─────────────────────────────────────────
    static async autoClassify(userId) {
        const [loans] = await sequelize.query(`
            SELECT lc.id, lc.approved_amount, lc.classification_id, lc.allowance_losses,
                   MIN(lrs.due_date) AS earliest_overdue
            FROM loan_contracts lc
            LEFT JOIN loan_repayment_schedules lrs 
                ON lrs.contract_id = lc.id AND lrs.is_paid = false
            WHERE lc.loan_status = 'ACTIVE'
            GROUP BY lc.id
        `);

        const today = new Date();
        let updated = 0;
        const results = [];

        for (const loan of loans) {
            const daysOverdue = loan.earliest_overdue
                ? Math.max(0, Math.floor((today - new Date(loan.earliest_overdue)) / (1000 * 60 * 60 * 24)))
                : 0;

            const rule = getClassification(daysOverdue);
            const newAllowance = Math.round(parseFloat(loan.approved_amount) * rule.rate);
            const oldClassId = loan.classification_id;

            if (oldClassId !== rule.classId) {
                await sequelize.query(`
                    UPDATE loan_contracts SET
                        classification_id = :classId,
                        classification_date = NOW(),
                        allowance_losses = :allowance,
                        updated_at = NOW()
                    WHERE id = :id
                `, { replacements: { id: loan.id, classId: rule.classId, allowance: newAllowance } });

                const oldAllowance = parseFloat(loan.allowance_losses || 0);
                const diff = newAllowance - oldAllowance;
                if (diff > 0) {
                    const loanAccounting = require('../services/loanAccounting.service');
                    await loanAccounting.recordProvision(
                        loan.id, diff,
                        `ປັບຊັ້ນ ${oldClassId || '?'} -> ${rule.classId} (${rule.code})`,
                        userId, null
                    );
                }

                updated++;
                results.push({
                    loanId: loan.id, daysOverdue,
                    oldClass: oldClassId,
                    newClass: `${rule.classId} (${rule.code})`,
                    allowance: newAllowance,
                });
            }
        }

        return {
            status: true,
            message: `ຈັດຊັ້ນ ສຳເລັດ: ${updated}/${loans.length} ສັນຍາ ປ່ຽນແປງ`,
            data: { total: loans.length, updated, results },
        };
    }

    // ─────────────────────────────────────────
    // ⑧ Submit Loan Application
    // ─────────────────────────────────────────
    static async submit(loanId) {
        const [rows] = await sequelize.query(
            `UPDATE loan_contracts SET loan_status = 'SUBMITTED', updated_at = NOW() 
             WHERE id = :id AND loan_status IN ('PENDING','DRAFT') RETURNING id, loan_status`,
            { replacements: { id: loanId } }
        );
        if (rows.length === 0) return { status: false, message: 'ບໍ່ພົບ ຫຼື ສະຖານະ ບໍ່ຖືກ' };
        return { status: true, message: 'ສົ່ງ ຄຳຮ້ອງ ແລ້ວ — ລໍຖ້າ ອະນຸມັດ' };
    }

    // ─────────────────────────────────────────
    // ⑨ Create Application
    // ─────────────────────────────────────────
    static async createApplication(data) {
        const { personalInfoId, enterpriseInfoId, loanProductId, requestedAmount, purpose, termMonths } = data;
        const [result] = await sequelize.query(`
            INSERT INTO loan_applications (personal_info_id, enterprise_info_id, loan_product_id,
                requested_amount, purpose, term_months, application_status, application_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', NOW(), NOW(), NOW()) RETURNING id
        `, {
            bind: [personalInfoId || null, enterpriseInfoId || null, loanProductId || null,
                requestedAmount || 0, purpose || '', termMonths || 12]
        });
        return { status: true, message: 'ສ້າງ ໃບສະໝັກ ແລ້ວ', data: { applicationId: result[0].id } };
    }

    // ─────────────────────────────────────────
    // ⑩ Update Loan (full transaction)
    // ─────────────────────────────────────────
    static async updateLoan(loanId, payload) {
        const t = await sequelize.transaction();
        try {
            const { personalInfo, enterpriseInfo, loanContract, fees, insurances, existingPersonId } = payload;

            if (loanContract) {
                await sequelize.query(`
                    UPDATE loan_contracts SET
                        product_id = :product_id, currency_id = :currency_id,
                        approved_amount = :approved_amount, interest_rate = :interest_rate,
                        term_months = :term_months, loan_term_id = :loan_term_id,
                        loan_type_id = :loan_type_id, loan_purpose_id = :loan_purpose_id,
                        economic_sector_id = :economic_sector_id, economic_branch_id = :economic_branch_id,
                        funding_source_id = :funding_source_id, classification_id = :classification_id,
                        borrower_connection_id = :borrower_connection_id, borrower_type_id = :borrower_type_id,
                        use_of_loan = :use_of_loan, allowance_losses = :allowance_losses,
                        updated_at = NOW()
                    WHERE id = :id
                `, {
                    replacements: {
                        id: loanId,
                        product_id: loanContract.product_id || null,
                        currency_id: loanContract.currency_id || null,
                        approved_amount: loanContract.approved_amount || 0,
                        interest_rate: loanContract.interest_rate || 0,
                        term_months: loanContract.term_months || 12,
                        loan_term_id: loanContract.loan_term_id || null,
                        loan_type_id: loanContract.loan_type_id || null,
                        loan_purpose_id: loanContract.loan_purpose_id || null,
                        economic_sector_id: loanContract.economic_sector_id || null,
                        economic_branch_id: loanContract.economic_branch_id || null,
                        funding_source_id: loanContract.funding_source_id || null,
                        classification_id: loanContract.classification_id || null,
                        borrower_connection_id: loanContract.borrower_connection_id || null,
                        borrower_type_id: loanContract.borrower_type_id || null,
                        use_of_loan: loanContract.use_of_loan || null,
                        allowance_losses: Math.round((loanContract.approved_amount || 0) * 0.01),
                    },
                    transaction: t,
                });
            }

            if (personalInfo && existingPersonId) {
                await sequelize.query(`
                    UPDATE personal_info SET
                        "firstname__la" = :fn_la, "lastname__la" = :ln_la,
                        "firstname__en" = :fn_en, "lastname__en" = :ln_en,
                        dateofbirth = :dob, gender_id = :gender_id,
                        career_id = :career_id, marital_status_id = :marital_status_id,
                        nationality_id = :nationality_id, village_id = :village_id,
                        mobile_no = :mobile_no, telephone_no = :telephone_no,
                        home_address = :home_address,
                        personal_code = :personal_code, phone_number = :phone_number,
                        spouse_firstname = :spouse_fn, spouse_lastname = :spouse_ln,
                        spouse_career_id = :spouse_career_id, spouse_mobile_number = :spouse_mobile,
                        total_family_members = :total_family, females = :females
                    WHERE id = :id
                `, {
                    replacements: {
                        id: existingPersonId,
                        fn_la: personalInfo.firstname__la, ln_la: personalInfo.lastname__la,
                        fn_en: personalInfo.firstname__en || null, ln_en: personalInfo.lastname__en || null,
                        dob: personalInfo.dateofbirth || null,
                        gender_id: personalInfo.gender_id, career_id: personalInfo.career_id,
                        marital_status_id: personalInfo.marital_status_id,
                        nationality_id: personalInfo.nationality_id,
                        village_id: personalInfo.village_id,
                        mobile_no: personalInfo.mobile_no || null,
                        telephone_no: personalInfo.telephone_no || null,
                        home_address: personalInfo.home_address || null,
                        personal_code: personalInfo.personal_code || null,
                        phone_number: personalInfo.phone_number || null,
                        spouse_fn: personalInfo.spouse_firstname || null,
                        spouse_ln: personalInfo.spouse_lastname || null,
                        spouse_career_id: personalInfo.spouse_career_id || null,
                        spouse_mobile: personalInfo.spouse_mobile_number || null,
                        total_family: personalInfo.total_family_members || null,
                        females: personalInfo.females || null,
                    },
                    transaction: t,
                });
            }

            // Replace fees
            await sequelize.query(`DELETE FROM loan_fees WHERE loan_id = :lid`, {
                replacements: { lid: loanId }, transaction: t,
            });
            if (fees?.length) {
                for (const f of fees) {
                    await sequelize.query(`
                        INSERT INTO loan_fees (loan_id, fee_type, fee_amount, deducted_from_loan, notes, created_at, updated_at)
                        VALUES (:lid, :fee_type, :fee_amount, :deducted, :notes, NOW(), NOW())
                    `, {
                        replacements: {
                            lid: loanId, fee_type: f.fee_type, fee_amount: f.fee_amount,
                            deducted: f.deducted_from_loan || false, notes: f.notes || '',
                        },
                        transaction: t,
                    });
                }
            }

            // Replace insurance
            await sequelize.query(`DELETE FROM loan_insurance WHERE loan_id = :lid`, {
                replacements: { lid: loanId }, transaction: t,
            });
            if (insurances?.length) {
                for (const ins of insurances) {
                    await sequelize.query(`
                        INSERT INTO loan_insurance (loan_id, insurance_type, premium, coverage_amount, beneficiary, notes, created_at, updated_at)
                        VALUES (:lid, :type, :premium, :coverage, :beneficiary, :notes, NOW(), NOW())
                    `, {
                        replacements: {
                            lid: loanId, type: ins.insurance_type, premium: ins.premium || 0,
                            coverage: ins.coverage_amount || 0, beneficiary: ins.beneficiary || '',
                            notes: ins.notes || '',
                        },
                        transaction: t,
                    });
                }
            }

            await t.commit();
            return { status: true, message: 'ອັບເດດ ສຳເລັດ', data: { loanId: Number(loanId) } };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    // ─────────────────────────────────────────
    // ⑪ Get Loan by ID (full detail)
    // ─────────────────────────────────────────
    static async getLoanById(loanId) {
        const [contracts] = await sequelize.query(
            `SELECT * FROM loan_contracts WHERE id = :id`, { replacements: { id: loanId } }
        );
        if (!contracts.length) throw Object.assign(new Error('ບໍ່ ພົບ ສັນຍາ'), { statusCode: 404 });
        const contract = contracts[0];

        let personalInfo = null;
        const [bi] = await sequelize.query(
            `SELECT bi.personal_info_id, pi.* FROM borrowers_individual bi
             JOIN personal_info pi ON pi.id = bi.personal_info_id
             WHERE bi.loan_id = :lid LIMIT 1`,
            { replacements: { lid: loanId } }
        );
        if (bi.length) personalInfo = bi[0];

        let enterpriseInfo = null;
        const [be] = await sequelize.query(
            `SELECT be.enterprise_id, ei.* FROM borrowers_enterprise be
             JOIN enterprise_info ei ON ei.id = be.enterprise_id
             WHERE be.loan_id = :lid LIMIT 1`,
            { replacements: { lid: loanId } }
        );
        if (be.length) enterpriseInfo = be[0];

        const [collaterals] = await sequelize.query(
            `SELECT c.* FROM collaterals c
             JOIN loan_collaterals lc ON lc.collateral_id = c.id
             WHERE lc.loan_id = :lid`,
            { replacements: { lid: loanId } }
        );

        const [fees] = await sequelize.query(
            `SELECT * FROM loan_fees WHERE loan_id = :lid AND deleted_at IS NULL`,
            { replacements: { lid: loanId } }
        );

        const [insurances] = await sequelize.query(
            `SELECT * FROM loan_insurance WHERE loan_id = :lid AND deleted_at IS NULL`,
            { replacements: { lid: loanId } }
        );

        return {
            status: true,
            data: {
                contract, personalInfo, enterpriseInfo,
                collaterals, fees, insurances,
                borrowerType: personalInfo ? 'individual' : enterpriseInfo ? 'enterprise' : 'group',
            },
        };
    }

    // ─────────────────────────────────────────
    // ⑫ Disburse Loan (CASH/TRANSFER/QR)
    // ─────────────────────────────────────────
    static async disburse(loanId, { method, mobileNo }, userId) {
        const t = await sequelize.transaction();
        try {
            const [loans] = await sequelize.query(
                `SELECT lc.approved_amount, lc.term_months, lc.loan_status, lc.org_id,
                        bi.personal_info_id
                 FROM loan_contracts lc
                 LEFT JOIN borrowers_individual bi ON bi.loan_id = lc.id
                 WHERE lc.id = :id`,
                { replacements: { id: loanId } }
            );
            if (!loans.length) { await t.rollback(); throw Object.assign(new Error('ບໍ່ ພົບ ສັນ ຍາ'), { statusCode: 404 }); }
            const loan = loans[0];

            // BoL Compliance
            const ceilingCheck = bol.validateLoanCeiling(parseFloat(loan.approved_amount));
            if (!ceilingCheck.valid) { await t.rollback(); throw Object.assign(new Error(ceilingCheck.message), { statusCode: 400 }); }

            const disbAmount = parseFloat(loan.approved_amount);
            if (disbAmount >= bol.BOL_LIMITS.CTR_THRESHOLD) {
                await bol.createCTRReport({
                    loanId, personId: loan.personal_info_id, amount: disbAmount,
                    currencyCode: 'LAK', orgId: loan.org_id || 1, transaction: t,
                });
            }

            if (method === 'CASH' || method === 'TRANSFER' || method === 'CHEQUE') {
                const disbDate = new Date().toISOString().split('T')[0];
                const matDate = new Date();
                matDate.setMonth(matDate.getMonth() + (loan.term_months || 12));
                const maturityDate = matDate.toISOString().split('T')[0];
                const allowance = Math.round(parseFloat(loan.approved_amount) * 0.01);

                await sequelize.query(`
                    UPDATE loan_contracts SET
                        loan_status = 'ACTIVE', disbursement_date = :disb_date,
                        maturity_date = :mat_date, classification_id = 1,
                        classification_date = :disb_date, allowance_losses = :allowance,
                        updated_at = NOW()
                    WHERE id = :id
                `, { replacements: { id: loanId, disb_date: disbDate, mat_date: maturityDate, allowance }, transaction: t });

                const loanAccounting = require('../services/loanAccounting.service');
                await loanAccounting.recordDisbursement(loanId, disbAmount, `ປ່ອຍເງິນກູ້ #${loanId} (${method})`, userId, t);
                if (allowance > 0) {
                    await loanAccounting.recordProvision(loanId, allowance, `ຕັ້ງສຳຮອງເບື້ອງຕົ້ນ ສັນຍາ #${loanId}`, userId, t);
                }

                await t.commit();
                return {
                    status: true, message: 'ປ່ອຍ ເງິນ ສຳ ເລັດ (+ ບັນທຶກ ບັນຊີ)',
                    data: {
                        method, disbursement_date: disbDate, maturity_date: maturityDate,
                        loan_status: 'ACTIVE', journal: 'Debit 1300 / Credit 1100',
                        provision: `${allowance.toLocaleString()} LAK (1%)`,
                    },
                };
            } else if (method === 'QR') {
                const jdbService = require('../services/jdb.service');
                const billNumber = `LOAN${loanId}T${Date.now()}`.slice(0, 25);
                const qrResult = await jdbService.generateQR({
                    amount: disbAmount, billNumber, mobileNo: mobileNo || '2000000000',
                });

                await sequelize.query(`
                    INSERT INTO jdb_transactions ("requestId", "billNumber", "txnAmount", "status", 
                        "transactionType", currency, "createdAt", "updatedAt", emv)
                    VALUES (:reqId, :bill, :amount, 'PENDING', 'DISBURSEMENT', 'LAK', NOW(), NOW(), :emv)
                `, {
                    replacements: { reqId: `LOAN-${loanId}`, bill: billNumber, amount: loan.approved_amount, emv: qrResult.emv },
                    transaction: t,
                });

                await t.commit();
                return {
                    status: true, message: 'ສ້າງ QR ສຳ ເລັດ — ລໍ ຖ້າ ລູກ ຄ້າ ສະ ແກນ',
                    data: { method: 'QR', billNumber, qrImage: qrResult.qrImage, emv: qrResult.emv, paymentLink: qrResult.paymentLink, loan_status: 'PENDING_DISBURSEMENT' },
                };
            } else {
                await t.rollback();
                throw Object.assign(new Error('ວິ ທີ ບໍ່ ຖືກ ຕ້ອງ'), { statusCode: 400 });
            }
        } catch (err) {
            if (t && !t.finished) await t.rollback();
            throw err;
        }
    }

    // ─────────────────────────────────────────
    // ⑬ Confirm QR Disbursement
    // ─────────────────────────────────────────
    static async disburseConfirm(loanId, billNumber, userId) {
        const [loans] = await sequelize.query(
            `SELECT term_months, approved_amount FROM loan_contracts WHERE id = :id`,
            { replacements: { id: loanId } }
        );

        const disbDate = new Date().toISOString().split('T')[0];
        const matDate = new Date();
        matDate.setMonth(matDate.getMonth() + (loans[0]?.term_months || 12));
        const maturityDate = matDate.toISOString().split('T')[0];

        await sequelize.query(`
            UPDATE loan_contracts SET
                loan_status = 'ACTIVE', disbursement_date = :disb_date,
                maturity_date = :mat_date, classification_id = 1,
                classification_date = :disb_date, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: loanId, disb_date: disbDate, mat_date: maturityDate } });

        const loanAccounting = require('../services/loanAccounting.service');
        const loanAmt = parseFloat(loans[0]?.approved_amount || 0);
        await loanAccounting.recordDisbursement(loanId, loanAmt, `ປ່ອຍເງິນກູ້ QR #${loanId}`, userId, null);
        const allowance = Math.round(loanAmt * 0.01);
        if (allowance > 0) {
            await loanAccounting.recordProvision(loanId, allowance, `ຕັ້ງສຳຮອງ ສັນຍາ #${loanId}`, userId, null);
        }

        if (billNumber) {
            await sequelize.query(`
                UPDATE jdb_transactions SET status = 'SUCCESS', "updatedAt" = NOW()
                WHERE "billNumber" = :bill
            `, { replacements: { bill: billNumber } });
        }

        return {
            status: true, message: 'ຢືນ ຢັນ ປ່ອຍ ເງິນ ສຳ ເລັດ',
            data: { disbursement_date: disbDate, maturity_date: maturityDate, loan_status: 'ACTIVE' },
        };
    }

    // ─────────────────────────────────────────
    // ⑭ Get Schedule
    // ─────────────────────────────────────────
    static async getSchedule(contractId) {
        const [rows] = await sequelize.query(`
            SELECT * FROM loan_repayment_schedules
            WHERE contract_id = :cid ORDER BY installment_no ASC
        `, { replacements: { cid: contractId } });
        return { status: true, data: rows };
    }

    // ─────────────────────────────────────────
    // ⑮ Generate Schedule (FLAT/DECLINING)
    // ─────────────────────────────────────────
    static async generateSchedule(loanId) {
        const [existing] = await sequelize.query(
            `SELECT COUNT(*) AS c FROM loan_repayment_schedules WHERE contract_id = :cid`,
            { replacements: { cid: loanId } }
        );
        if (parseInt(existing[0]?.c) > 0) return { status: true, message: 'ຕາ ຕະ ລາງ ມີ ແລ້ວ' };

        const [loans] = await sequelize.query(
            `SELECT approved_amount, interest_rate, term_months, disbursement_date 
             FROM loan_contracts WHERE id = :id`,
            { replacements: { id: loanId } }
        );
        if (!loans.length) throw Object.assign(new Error('ບໍ່ ພົບ ສັນ ຍາ'), { statusCode: 404 });

        const loan = loans[0];
        const principal = parseFloat(loan.approved_amount);
        const rate = parseFloat(loan.interest_rate) / 100 / 12;
        const months = parseInt(loan.term_months) || 12;
        const method = 'FLAT';
        const startDate = loan.disbursement_date ? new Date(loan.disbursement_date) : new Date();

        const rows = [];
        let balance = principal;
        for (let i = 1; i <= months; i++) {
            const pp = principal / months;
            const interest = method === 'FLAT' ? principal * rate : balance * rate;
            balance -= pp;
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            rows.push({
                contract_id: loanId, installment_no: i,
                due_date: dueDate.toISOString().split('T')[0],
                principal_due: Math.round(pp * 100) / 100,
                interest_due: Math.round(interest * 100) / 100,
                total_amount: Math.round((pp + interest) * 100) / 100,
                is_paid: false, paid_amount: 0, paid_principal: 0, paid_interest: 0,
                penalty_amount: 0, paid_penalty: 0, status: 'SCHEDULED',
            });
        }

        const placeholders = rows.map((_, i) => `(
            :cid${i}, :ino${i}, :dd${i}, :pd${i}, :id${i}, :ta${i},
            false, 0, 0, 0, 0, 0, 'SCHEDULED', NOW()
        )`).join(',');

        const replacements = {};
        rows.forEach((r, i) => {
            replacements[`cid${i}`] = r.contract_id;
            replacements[`ino${i}`] = r.installment_no;
            replacements[`dd${i}`] = r.due_date;
            replacements[`pd${i}`] = r.principal_due;
            replacements[`id${i}`] = r.interest_due;
            replacements[`ta${i}`] = r.total_amount;
        });

        await sequelize.query(`
            INSERT INTO loan_repayment_schedules 
                (contract_id, installment_no, due_date, principal_due, interest_due, total_amount,
                 is_paid, paid_amount, paid_principal, paid_interest, penalty_amount, paid_penalty, status, created_at)
            VALUES ${placeholders}
        `, { replacements });

        return { status: true, message: `ສ້າງ ${months} ງວດ ສຳ ເລັດ`, count: months };
    }

    // ─────────────────────────────────────────
    // ⑯ Repay Loan
    // ─────────────────────────────────────────
    static async repay(loanId, { scheduleId, principalPaid, interestPaid, penaltyPaid, method }, userId) {
        if (!scheduleId) throw Object.assign(new Error('ຕ້ອງ ລະ ບຸ scheduleId'), { statusCode: 400 });

        const t = await sequelize.transaction();
        try {
            const totalPaid = (principalPaid || 0) + (interestPaid || 0) + (penaltyPaid || 0);

            await sequelize.query(`
                UPDATE loan_repayment_schedules SET
                    is_paid = true, paid_amount = :total, paid_principal = :pp,
                    paid_interest = :pi, paid_penalty = :pen, status = 'PAID'
                WHERE id = :sid
            `, {
                replacements: { sid: scheduleId, total: totalPaid, pp: principalPaid || 0, pi: interestPaid || 0, pen: penaltyPaid || 0 },
                transaction: t,
            });

            const loanAccounting = require('../services/loanAccounting.service');
            await loanAccounting.recordRepayment(
                loanId,
                { principalPaid: principalPaid || 0, interestPaid: interestPaid || 0, penaltyPaid: penaltyPaid || 0 },
                `ຮັບ ຊຳ ລະ ສັນ ຍາ #${loanId} (${method || 'CASH'})`,
                userId, t
            );

            const [remaining] = await sequelize.query(
                `SELECT COUNT(*) AS c FROM loan_repayment_schedules 
                 WHERE contract_id = :cid AND is_paid = false`,
                { replacements: { cid: loanId }, transaction: t }
            );

            if (parseInt(remaining[0]?.c) === 0) {
                await sequelize.query(
                    `UPDATE loan_contracts SET loan_status = 'CLOSED', updated_at = NOW() WHERE id = :id`,
                    { replacements: { id: loanId }, transaction: t }
                );
            }

            await t.commit();
            return {
                status: true, message: `ຊຳ ລະ ສຳ ເລັດ: ${totalPaid.toLocaleString()} LAK`,
                data: { totalPaid, remaining: parseInt(remaining[0]?.c), journal: 'Debit 110 / Credit 130+410' },
            };
        } catch (err) {
            if (t && !t.finished) await t.rollback();
            throw err;
        }
    }

    // ─────────────────────────────────────────
    // ⑰ Generate Repay QR
    // ─────────────────────────────────────────
    static async repayQR(loanId, { scheduleId, amount, mobileNo }) {
        const jdbService = require('../services/jdb.service');
        const billNumber = `REP${loanId}S${scheduleId}T${Date.now()}`.slice(0, 25);

        const qrResult = await jdbService.generateQR({
            amount: parseFloat(amount), billNumber, mobileNo: mobileNo || '2000000000',
        });

        await sequelize.query(`
            INSERT INTO jdb_transactions ("requestId", "billNumber", "txnAmount", "status",
                "transactionType", currency, "createdAt", "updatedAt", emv)
            VALUES (:reqId, :bill, :amount, 'PENDING', 'REPAYMENT', 'LAK', NOW(), NOW(), :emv)
        `, {
            replacements: { reqId: `REP-${loanId}-${scheduleId}`, bill: billNumber, amount, emv: qrResult.emv },
        });

        return { status: true, data: { billNumber, qrImage: qrResult.qrImage, emv: qrResult.emv } };
    }

    // ─────────────────────────────────────────
    // ⑱ JDB Config Status
    // ─────────────────────────────────────────
    static async getJdbConfig() {
        const hasConfig = !!(process.env.JDB_BASE_URL && process.env.JDB_PARTNER_ID);
        let connected = false;

        if (hasConfig) {
            const net = require('net');
            try {
                const url = new URL(process.env.JDB_BASE_URL);
                connected = await new Promise((resolve) => {
                    const sock = new net.Socket();
                    sock.setTimeout(3000);
                    sock.on('connect', () => { sock.destroy(); resolve(true); });
                    sock.on('timeout', () => { sock.destroy(); resolve(false); });
                    sock.on('error', () => { sock.destroy(); resolve(false); });
                    sock.connect(parseInt(url.port) || 443, url.hostname);
                });
            } catch { connected = false; }
        }

        return {
            status: true,
            data: {
                configured: hasConfig, connected,
                baseUrl: process.env.JDB_BASE_URL ? '***configured***' : null,
                partnerId: process.env.JDB_PARTNER_ID ? '***configured***' : null,
                callbackUrl: process.env.JDB_CALLBACK_URL || null,
            },
        };
    }
}

module.exports = LoanProcessService;
