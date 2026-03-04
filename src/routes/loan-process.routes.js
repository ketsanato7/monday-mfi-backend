/**
 * loan-process.routes.js — API ບັນ ທຶກ ຂະ ບວນ ການ ປ່ອຍ ກູ້ (transaction ດຽວ)
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const sequelize = db.sequelize;
const { requirePermission } = require('../middleware/rbac');

// POST /api/loan-process — ບັນ ທຶກ ທັງ ໝົດ ໃນ transaction
router.post('/loan-process', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            borrowerType, personalInfo, enterpriseInfo, groupMembers,
            documents, loanContract, collaterals, fees, insurances,
            existingPersonId, existingEnterpriseId,
        } = req.body;

        let personId = existingPersonId || null;
        let enterpriseId = existingEnterpriseId || null;

        // ─── Personal Info ───
        if (borrowerType === 'individual' && !personId && personalInfo) {
            const [piResult] = await sequelize.query(`
                INSERT INTO personal_info ("firstname__la", "lastname__la", "firstname__en", "lastname__en",
                    dateofbirth, gender_id, career_id, marital_status_id, nationality_id, village_id,
                    mobile_no, telephone_no, home_address,
                    personal_code, phone_number, spouse_firstname, spouse_lastname,
                    spouse_career_id, spouse_mobile_number, total_family_members, females)
                VALUES (:fn_la, :ln_la, :fn_en, :ln_en, :dob, :gender_id, :career_id, :marital_status_id,
                    :nationality_id, :village_id, :mobile_no, :telephone_no, :home_address,
                    :personal_code, :phone_number, :spouse_fn, :spouse_ln,
                    :spouse_career_id, :spouse_mobile, :total_family, :females)
                RETURNING id
            `, {
                replacements: {
                    fn_la: personalInfo.firstname__la, ln_la: personalInfo.lastname__la,
                    fn_en: personalInfo.firstname__en || null, ln_en: personalInfo.lastname__en || null,
                    dob: personalInfo.dateofbirth || null,
                    gender_id: personalInfo.gender_id, career_id: personalInfo.career_id,
                    marital_status_id: personalInfo.marital_status_id,
                    nationality_id: personalInfo.nationality_id, village_id: personalInfo.village_id,
                    mobile_no: personalInfo.mobile_no || null, telephone_no: personalInfo.telephone_no || null,
                    home_address: personalInfo.home_address || null,
                    personal_code: personalInfo.personal_code || null,
                    phone_number: personalInfo.phone_number || null,
                    spouse_fn: personalInfo.spouse_firstname || null,
                    spouse_ln: personalInfo.spouse_lastname || null,
                    spouse_career_id: personalInfo.spouse_career_id || null,
                    spouse_mobile: personalInfo.spouse_mobile_number || null,
                    total_family: personalInfo.total_family_members || null,
                    females: personalInfo.females || null,
                }, transaction: t,
            });
            personId = piResult[0].id;
        }

        // ─── Enterprise Info ───
        if (borrowerType === 'enterprise' && !enterpriseId && enterpriseInfo) {
            const [eiResult] = await sequelize.query(`
                INSERT INTO enterprise_info ("name__l_a", "name__e_n", register_no, registrant,
                    enterprise_type_id, enterprise_size_id, village_id, tax_no, mobile_no)
                VALUES (:name_la, :name_en, :reg_no, :registrant, :type_id, :size_id, :village_id, :tax_no, :mobile)
                RETURNING id
            `, {
                replacements: {
                    name_la: enterpriseInfo.name__l_a, name_en: enterpriseInfo.name__e_n || null,
                    reg_no: enterpriseInfo.register_no, registrant: enterpriseInfo.registrant || '',
                    type_id: enterpriseInfo.enterprise_type_id || null,
                    size_id: enterpriseInfo.enterprise_size_id || null,
                    village_id: enterpriseInfo.village_id || null,
                    tax_no: enterpriseInfo.tax_no || null, mobile: enterpriseInfo.mobile_no || null,
                }, transaction: t,
            });
            enterpriseId = eiResult[0].id;
        }

        // ─── Documents ───
        if (personId && documents) {
            if (documents.idCard) {
                await sequelize.query(`
                    INSERT INTO lao_id_cards (card_no, card_name, date_of_issue, exp_date, person_id, created_at, updated_at)
                    VALUES (:card_no, :card_name, :date_of_issue, :exp_date, :person_id, NOW(), NOW())
                `, { replacements: { ...documents.idCard, person_id: personId }, transaction: t });
            }
            if (documents.familyBook) {
                await sequelize.query(`
                    INSERT INTO family_books (book_no, book_name, province_id, issue_date, person_id, created_at, updated_at)
                    VALUES (:book_no, :book_name, :province_id, :issue_date, :person_id, NOW(), NOW())
                `, { replacements: { ...documents.familyBook, person_id: personId }, transaction: t });
            }
            if (documents.passport) {
                await sequelize.query(`
                    INSERT INTO passports (passport_no, passport_name, exp_date, person_id, created_at, updated_at)
                    VALUES (:passport_no, :passport_name, :exp_date, :person_id, NOW(), NOW())
                `, { replacements: { ...documents.passport, person_id: personId }, transaction: t });
            }
        }

        // ─── Loan Contract ───
        const [lcResult] = await sequelize.query(`
            INSERT INTO loan_contracts (contract_no, product_id, currency_id, approved_amount,
                interest_rate, term_months, loan_term_id, disbursement_date, maturity_date,
                loan_type_id, loan_purpose_id, economic_sector_id, economic_branch_id,
                funding_source_id, classification_id, borrower_connection_id, borrower_type_id,
                use_of_loan, allowance_losses,
                loan_status, remaining_balance, created_at, updated_at)
            VALUES (:contract_no, :product_id, :currency_id, :approved_amount,
                :interest_rate, :term_months, :loan_term_id, :disbursement_date, :maturity_date,
                :loan_type_id, :loan_purpose_id, :economic_sector_id, :economic_branch_id,
                :funding_source_id, :classification_id, :borrower_connection_id, :borrower_type_id,
                :use_of_loan, :allowance_losses,
                'PENDING', :approved_amount, NOW(), NOW())
            RETURNING id
        `, {
            replacements: {
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
            }, transaction: t,
        });
        const loanId = lcResult[0].id;

        // ─── Borrowers ───
        if (borrowerType === 'individual' && personId) {
            await sequelize.query(`
                INSERT INTO borrowers_individual (borrower_id, loan_id, personal_info_id)
                VALUES (:bid, :lid, :pid)
            `, { replacements: { bid: personId, lid: loanId, pid: personId }, transaction: t });
        } else if (borrowerType === 'enterprise' && enterpriseId) {
            await sequelize.query(`
                INSERT INTO borrowers_enterprise (enterprise_id, loan_id)
                VALUES (:eid, :lid)
            `, { replacements: { eid: enterpriseId, lid: loanId }, transaction: t });
        } else if (borrowerType === 'group' && groupMembers?.length > 0) {
            for (const memberId of groupMembers) {
                await sequelize.query(`
                    INSERT INTO borrowers_individual (borrower_id, loan_id, personal_info_id)
                    VALUES (:bid, :lid, :pid)
                `, { replacements: { bid: memberId, lid: loanId, pid: memberId }, transaction: t });
            }
        }

        // ─── Collaterals ───
        if (collaterals?.length > 0) {
            for (const col of collaterals) {
                const [colResult] = await sequelize.query(`
                    INSERT INTO collaterals (category_id, name, collateral_no, date_of_issue, value, other_details, created_at, updated_at)
                    VALUES (:category_id, :name, :collateral_no, :date_of_issue, :value, :other_details, NOW(), NOW())
                    RETURNING id
                `, {
                    replacements: {
                        category_id: col.category_id, name: col.name,
                        collateral_no: col.collateral_no || '', date_of_issue: col.date_of_issue || new Date().toISOString().split('T')[0],
                        value: col.value || '0', other_details: col.other_details || '',
                    }, transaction: t,
                });
                await sequelize.query(`
                    INSERT INTO loan_collaterals (collateral_id, loan_id, created_at, updated_at)
                    VALUES (:cid, :lid, NOW(), NOW())
                `, { replacements: { cid: colResult[0].id, lid: loanId }, transaction: t });
            }
        }

        // ─── Fees ───
        if (fees?.length > 0) {
            for (const fee of fees) {
                await sequelize.query(`
                    INSERT INTO loan_fees (loan_id, fee_type, fee_amount, deducted_from_loan, notes, created_at, updated_at)
                    VALUES (:loan_id, :fee_type, :fee_amount, :deducted, :notes, NOW(), NOW())
                `, {
                    replacements: {
                        loan_id: loanId, fee_type: fee.fee_type,
                        fee_amount: fee.fee_amount, deducted: fee.deducted_from_loan ?? false,
                        notes: fee.notes || '',
                    }, transaction: t,
                });
            }
        }

        // ─── Insurance ───
        if (insurances?.length > 0) {
            for (const ins of insurances) {
                await sequelize.query(`
                    INSERT INTO loan_insurance (loan_id, insurance_type, premium, coverage_amount, start_date, end_date, beneficiary, notes, created_at, updated_at)
                    VALUES (:loan_id, :ins_type, :premium, :coverage, :start_date, :end_date, :beneficiary, :notes, NOW(), NOW())
                `, {
                    replacements: {
                        loan_id: loanId, ins_type: ins.insurance_type,
                        premium: ins.premium, coverage: ins.coverage_amount || 0,
                        start_date: ins.start_date || null, end_date: ins.end_date || null,
                        beneficiary: ins.beneficiary || '', notes: ins.notes || '',
                    }, transaction: t,
                });
            }
        }

        await t.commit();
        res.json({ status: true, message: 'ບັນ ທຶກ ສຳ ເລັດ', data: { loanId, personId, enterpriseId } });
    } catch (err) {
        await t.rollback();
        console.error('Loan process error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// GET /api/loan-process/pending
router.get('/loan-process/pending', async (req, res) => {
    try {
        const [rows] = await sequelize.query(`
            SELECT lc.*, lp.value as product_name, c.code as currency_code
            FROM loan_contracts lc
            LEFT JOIN loan_products lp ON lc.product_id = lp.id
            LEFT JOIN currencies c ON lc.currency_id = c.id
            WHERE lc.loan_status = 'PENDING'
            ORDER BY lc.created_at DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/loan-process/:id/approve
router.put('/loan-process/:id/approve', requirePermission('ອະນຸມັດສິນເຊື່ອ'), async (req, res) => {
    try {
        await sequelize.query(`UPDATE loan_contracts SET loan_status = 'APPROVED', updated_at = NOW() WHERE id = :id`, { replacements: { id: req.params.id } });
        res.json({ status: true, message: 'ອະ ນຸ ມັດ ແລ້ວ' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/loan-process/:id/reject
router.put('/loan-process/:id/reject', requirePermission('ອະນຸມັດສິນເຊື່ອ'), async (req, res) => {
    try {
        await sequelize.query(`UPDATE loan_contracts SET loan_status = 'REJECTED', updated_at = NOW() WHERE id = :id`, { replacements: { id: req.params.id } });
        res.json({ status: true, message: 'ປະ ຕິ ເສດ ແລ້ວ' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═══════════════════════════════════════════
// LP Pipeline — Status Dashboard + Transitions
// ═══════════════════════════════════════════

// GET /api/loan-process/pipeline — ສະຖານະ ທັງໝົດ
router.get('/loan-process/pipeline', async (_req, res) => {
    try {
        // Status counts
        const counts = await sequelize.query(`
            SELECT loan_status, COUNT(*) as count
            FROM loan_contracts
            GROUP BY loan_status ORDER BY loan_status
        `, { type: sequelize.QueryTypes.SELECT });

        // Recent applications (DISTINCT ON prevents duplicates from LEFT JOIN)
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

        res.json({
            status: true,
            pipeline: {
                counts: counts.reduce((acc, c) => { acc[c.loan_status] = parseInt(c.count); return acc; }, {}),
                recent
            }
        });
    } catch (err) { res.status(500).json({ status: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// BOL Classification Rules (static, before /:id routes)
// ═══════════════════════════════════════════════════════
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

router.post('/loan-process/auto-classify', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
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
                        req.user?.id, null
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

        res.json({
            status: true,
            message: `ຈັດຊັ້ນ ສຳເລັດ: ${updated}/${loans.length} ສັນຍາ ປ່ຽນແປງ`,
            data: { total: loans.length, updated, results },
        });
    } catch (err) {
        console.error('Auto classify error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

router.get('/loan-process/jdb-config', async (_req, res) => {
    try {
        const hasConfig = !!(process.env.JDB_BASE_URL && process.env.JDB_PARTNER_ID);
        let connected = false;

        if (hasConfig) {
            // Quick TCP check (3s) instead of full auth (15s+)
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

        res.json({
            status: true,
            data: {
                configured: hasConfig,
                connected,
                baseUrl: process.env.JDB_BASE_URL ? '***configured***' : null,
                partnerId: process.env.JDB_PARTNER_ID ? '***configured***' : null,
                callbackUrl: process.env.JDB_CALLBACK_URL || null,
            },
        });
    } catch (err) {
        res.json({ status: false, message: err.message });
    }
});

// PUT /api/loan-process/:id/submit — ສົ່ງ ຄຳຮ້ອງ
router.put('/loan-process/:id/submit', async (req, res) => {
    try {
        const [rows] = await sequelize.query(
            `UPDATE loan_contracts SET loan_status = 'SUBMITTED', updated_at = NOW() 
             WHERE id = :id AND loan_status IN ('PENDING','DRAFT') RETURNING id, loan_status`,
            { replacements: { id: req.params.id } }
        );
        if (rows.length === 0) return res.json({ status: false, message: 'ບໍ່ພົບ ຫຼື ສະຖານະ ບໍ່ຖືກ' });
        res.json({ status: true, message: 'ສົ່ງ ຄຳຮ້ອງ ແລ້ວ — ລໍຖ້າ ອະນຸມັດ' });
    } catch (err) { res.status(500).json({ status: false, message: err.message }); }
});

// PUT /loan-process/:id/disburse → ​ຍ້າຍ​ໄປ​ ​ endpoint ​ໃໝ່​ ​ຢູ່​ ​ລຸ່ມ (​ມີ journal entries + QR)\n// (old simple route removed — see comprehensive route below)

// POST /api/loan-process/create-application — LP3 ສ້າງ ໃບສະໝັກ
router.post('/loan-process/create-application', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const { personalInfoId, enterpriseInfoId, loanProductId, requestedAmount, purpose, termMonths } = req.body;
        const [result] = await sequelize.query(`
            INSERT INTO loan_applications (personal_info_id, enterprise_info_id, loan_product_id,
                requested_amount, purpose, term_months, application_status, application_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', NOW(), NOW(), NOW()) RETURNING id
        `, {
            bind: [personalInfoId || null, enterpriseInfoId || null, loanProductId || null,
            requestedAmount || 0, purpose || '', termMonths || 12]
        });
        res.json({ status: true, message: 'ສ້າງ ໃບສະໝັກ ແລ້ວ', data: { applicationId: result[0].id } });
    } catch (err) { res.status(500).json({ status: false, message: err.message }); }
});

// ═══════════════════════════════════════════
// PUT /api/loan-process/:id — ອັບເດດ ສັນຍາ ເດີມ
// ═══════════════════════════════════════════
router.put('/loan-process/:id', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const loanId = req.params.id;
        const { personalInfo, enterpriseInfo, loanContract, collaterals, fees, insurances } = req.body;

        // ─── Update loan_contracts ───
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

        // ─── Update personal_info ───
        if (personalInfo && req.body.existingPersonId) {
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
                    id: req.body.existingPersonId,
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

        // ─── Replace fees (delete + re-insert) ───
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

        // ─── Replace insurance (delete + re-insert) ───
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
        res.json({ status: true, message: 'ອັບເດດ ສຳເລັດ', data: { loanId: Number(loanId) } });
    } catch (err) {
        await t.rollback();
        console.error('Update loan error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════
// GET /api/loan-process/:id — ໂຫຼດ ສັນຍາ ເດີມ (MUST be LAST — after all named routes)
// ═══════════════════════════════════════════
router.get('/loan-process/:id', async (req, res) => {
    try {
        const loanId = req.params.id;

        // Loan contract
        const [contracts] = await sequelize.query(
            `SELECT * FROM loan_contracts WHERE id = :id`, { replacements: { id: loanId } }
        );
        if (!contracts.length) return res.status(404).json({ status: false, message: 'ບໍ່ ພົບ ສັນຍາ' });
        const contract = contracts[0];

        // Borrower — individual
        let personalInfo = null;
        const [bi] = await sequelize.query(
            `SELECT bi.personal_info_id, pi.* FROM borrowers_individual bi
             JOIN personal_info pi ON pi.id = bi.personal_info_id
             WHERE bi.loan_id = :lid LIMIT 1`,
            { replacements: { lid: loanId } }
        );
        if (bi.length) personalInfo = bi[0];

        // Borrower — enterprise
        let enterpriseInfo = null;
        const [be] = await sequelize.query(
            `SELECT be.enterprise_id, ei.* FROM borrowers_enterprise be
             JOIN enterprise_info ei ON ei.id = be.enterprise_id
             WHERE be.loan_id = :lid LIMIT 1`,
            { replacements: { lid: loanId } }
        );
        if (be.length) enterpriseInfo = be[0];

        // Collaterals
        const [collaterals] = await sequelize.query(
            `SELECT c.* FROM collaterals c
             JOIN loan_collaterals lc ON lc.collateral_id = c.id
             WHERE lc.loan_id = :lid`,
            { replacements: { lid: loanId } }
        );

        // Fees
        const [fees] = await sequelize.query(
            `SELECT * FROM loan_fees WHERE loan_id = :lid AND deleted_at IS NULL`,
            { replacements: { lid: loanId } }
        );

        // Insurance
        const [insurances] = await sequelize.query(
            `SELECT * FROM loan_insurance WHERE loan_id = :lid AND deleted_at IS NULL`,
            { replacements: { lid: loanId } }
        );

        res.json({
            status: true,
            data: {
                contract, personalInfo, enterpriseInfo,
                collaterals, fees, insurances,
                borrowerType: personalInfo ? 'individual' : enterpriseInfo ? 'enterprise' : 'group',
            }
        });
    } catch (err) {
        console.error('Load loan error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});
// ═══════════════════════════════════════════════════════
// PUT /loan-process/:id/disburse
// ກໍລະນີ 1: CASH/TRANSFER — ບັນທຶກ ມື → loan_status = ACTIVE
// ກໍລະນີ 2: QR — ສ້າງ QR ຜ່ານ JDB → ລໍ ຖ້າ ຈ່າຍ
// ═══════════════════════════════════════════════════════
router.put('/loan-process/:id/disburse', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const loanId = req.params.id;
        const { method, mobileNo } = req.body; // 'CASH' | 'TRANSFER' | 'QR'

        // Get loan info
        const [loans] = await sequelize.query(
            `SELECT approved_amount, term_months, loan_status FROM loan_contracts WHERE id = :id`,
            { replacements: { id: loanId } }
        );
        if (!loans.length) {
            await t.rollback();
            return res.status(404).json({ status: false, message: 'ບໍ່ ພົບ ສັນ ຍາ' });
        }
        const loan = loans[0];

        if (method === 'CASH' || method === 'TRANSFER' || method === 'CHEQUE') {
            // ─── ກໍລະນີ 1: ບັນທຶກ ມື ─── 
            const disbDate = new Date().toISOString().split('T')[0];
            const matDate = new Date();
            matDate.setMonth(matDate.getMonth() + (loan.term_months || 12));
            const maturityDate = matDate.toISOString().split('T')[0];
            const allowance = Math.round(parseFloat(loan.approved_amount) * 0.01);

            await sequelize.query(`
                UPDATE loan_contracts SET
                    loan_status = 'ACTIVE',
                    disbursement_date = :disb_date,
                    maturity_date = :mat_date,
                    classification_id = 1,
                    classification_date = :disb_date,
                    allowance_losses = :allowance,
                    updated_at = NOW()
                WHERE id = :id
            `, {
                replacements: { id: loanId, disb_date: disbDate, mat_date: maturityDate, allowance },
                transaction: t,
            });

            // ─── ບັນທຶກ ບັນຊີ ຕາມ ຫຼັກ ການ ລາວ ───
            const loanAccounting = require('../services/loanAccounting.service');
            const amount = parseFloat(loan.approved_amount);
            await loanAccounting.recordDisbursement(loanId, amount, `ປ່ອຍເງິນກູ້ #${loanId} (${method})`, req.user?.id, t);
            // ຕັ້ງ ສຳ ຮອງ ຊັ້ນ 1 = 1%
            if (allowance > 0) {
                await loanAccounting.recordProvision(loanId, allowance, `ຕັ້ງສຳຮອງເບື້ອງຕົ້ນ ສັນຍາ #${loanId}`, req.user?.id, t);
            }

            await t.commit();
            res.json({
                status: true,
                message: 'ປ່ອຍ ເງິນ ສຳ ເລັດ (+ ບັນທຶກ ບັນຊີ)',
                data: {
                    method,
                    disbursement_date: disbDate,
                    maturity_date: maturityDate,
                    loan_status: 'ACTIVE',
                    journal: 'Debit 1300 / Credit 1100',
                    provision: `${allowance.toLocaleString()} LAK (1%)`,
                },
            });
        } else if (method === 'QR') {
            // ─── ກໍລະນີ 2: ສ້າງ QR ຜ່ານ JDB ───
            try {
                const jdbService = require('../services/jdb.service');
                const billNumber = `LOAN${loanId}T${Date.now()}`.slice(0, 25);

                const qrResult = await jdbService.generateQR({
                    amount: parseFloat(loan.approved_amount),
                    billNumber,
                    mobileNo: mobileNo || '2000000000',
                });

                // Save to jdb_transactions
                await sequelize.query(`
                    INSERT INTO jdb_transactions ("requestId", "billNumber", "txnAmount", "status", 
                        "transactionType", currency, "createdAt", "updatedAt", emv)
                    VALUES (:reqId, :bill, :amount, 'PENDING', 'DISBURSEMENT', 'LAK', NOW(), NOW(), :emv)
                `, {
                    replacements: {
                        reqId: `LOAN-${loanId}`,
                        bill: billNumber,
                        amount: loan.approved_amount,
                        emv: qrResult.emv,
                    },
                    transaction: t,
                });

                await t.commit();
                res.json({
                    status: true,
                    message: 'ສ້າງ QR ສຳ ເລັດ — ລໍ ຖ້າ ລູກ ຄ້າ ສະ ແກນ',
                    data: {
                        method: 'QR',
                        billNumber,
                        qrImage: qrResult.qrImage,
                        emv: qrResult.emv,
                        paymentLink: qrResult.paymentLink,
                        loan_status: 'PENDING_DISBURSEMENT',
                    },
                });
            } catch (jdbErr) {
                await t.rollback();
                res.status(502).json({
                    status: false,
                    message: `JDB Error: ${jdbErr.message}`,
                    jdbAvailable: false,
                });
            }
        } else {
            await t.rollback();
            res.status(400).json({ status: false, message: 'ວິ ທີ ບໍ່ ຖືກ ຕ້ອງ' });
        }
    } catch (err) {
        await t.rollback();
        console.error('Disburse error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// PUT /loan-process/:id/disburse-confirm
// ຢືນ ຢັນ ການ ຈ່າຍ QR ສຳ ເລັດ (ກວດ ຈາກ JDB ຫຼື ຢືນ ຢັນ ມື)
// ═══════════════════════════════════════════════════════
router.put('/loan-process/:id/disburse-confirm', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const loanId = req.params.id;
        const { billNumber } = req.body;

        // Get loan term
        const [loans] = await sequelize.query(
            `SELECT term_months FROM loan_contracts WHERE id = :id`,
            { replacements: { id: loanId } }
        );

        const disbDate = new Date().toISOString().split('T')[0];
        const matDate = new Date();
        matDate.setMonth(matDate.getMonth() + (loans[0]?.term_months || 12));
        const maturityDate = matDate.toISOString().split('T')[0];

        await sequelize.query(`
            UPDATE loan_contracts SET
                loan_status = 'ACTIVE',
                disbursement_date = :disb_date,
                maturity_date = :mat_date,
                classification_id = 1,
                classification_date = :disb_date,
                updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: loanId, disb_date: disbDate, mat_date: maturityDate } });

        // ─── ບັນທຶກ ບັນຊີ ───
        const loanAccounting = require('../services/loanAccounting.service');
        const [loanInfo] = await sequelize.query(
            `SELECT approved_amount FROM loan_contracts WHERE id = :id`, { replacements: { id: loanId } }
        );
        const loanAmt = parseFloat(loanInfo[0]?.approved_amount || 0);
        await loanAccounting.recordDisbursement(loanId, loanAmt, `ປ່ອຍເງິນກູ້ QR #${loanId}`, req.user?.id, null);
        const allowance = Math.round(loanAmt * 0.01);
        if (allowance > 0) {
            await loanAccounting.recordProvision(loanId, allowance, `ຕັ້ງສຳຮອງ ສັນຍາ #${loanId}`, req.user?.id, null);
        }

        // Update jdb_transactions status
        if (billNumber) {
            await sequelize.query(`
                UPDATE jdb_transactions SET status = 'SUCCESS', "updatedAt" = NOW()
                WHERE "billNumber" = :bill
            `, { replacements: { bill: billNumber } });
        }

        res.json({
            status: true,
            message: 'ຢືນ ຢັນ ປ່ອຍ ເງິນ ສຳ ເລັດ',
            data: { disbursement_date: disbDate, maturity_date: maturityDate, loan_status: 'ACTIVE' },
        });
    } catch (err) {
        console.error('Disburse confirm error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// GET /loan-process/:id/check-qr/:billNumber
// ກວດ ສະ ຖານະ QR ຈາກ JDB
// ═══════════════════════════════════════════════════════
router.get('/loan-process/:id/check-qr/:billNumber', async (req, res) => {
    try {
        const jdbService = require('../services/jdb.service');
        const result = await jdbService.checkTransaction(req.params.billNumber);
        const isPaid = result.success && result.data?.message === 'SUCCESS';

        res.json({ status: true, paid: isPaid, data: result.data || null });
    } catch (err) {
        res.json({ status: true, paid: false, message: err.message });
    }
});
// ═══════════════════════════════════════════════════════
// GET /loan-process/:id/schedule
// ດຶງ ຕາ ຕະ ລາງ ຊຳ ລະ ຈາກ DB
// ═══════════════════════════════════════════════════════
router.get('/loan-process/:id/schedule', async (req, res) => {
    try {
        const [rows] = await sequelize.query(`
            SELECT * FROM loan_repayment_schedules
            WHERE contract_id = :cid
            ORDER BY installment_no ASC
        `, { replacements: { cid: req.params.id } });

        res.json({ status: true, data: rows });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /loan-process/:id/generate-schedule
// ສ້າງ ຕາ ຕະ ລາງ ຊຳ ລະ (FLAT/DECLINING)
// ═══════════════════════════════════════════════════════
router.post('/loan-process/:id/generate-schedule', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const loanId = req.params.id;

        // Check if schedule already exists
        const [existing] = await sequelize.query(
            `SELECT COUNT(*) AS c FROM loan_repayment_schedules WHERE contract_id = :cid`,
            { replacements: { cid: loanId } }
        );
        if (parseInt(existing[0]?.c) > 0) {
            return res.json({ status: true, message: 'ຕາ ຕະ ລາງ ມີ ແລ້ວ' });
        }

        // Get loan info
        const [loans] = await sequelize.query(
            `SELECT approved_amount, interest_rate, term_months, disbursement_date 
             FROM loan_contracts WHERE id = :id`,
            { replacements: { id: loanId } }
        );
        if (!loans.length) return res.status(404).json({ status: false, message: 'ບໍ່ ພົບ ສັນ ຍາ' });

        const loan = loans[0];
        const principal = parseFloat(loan.approved_amount);
        const rate = parseFloat(loan.interest_rate) / 100 / 12;
        const months = parseInt(loan.term_months) || 12;
        const method = 'FLAT'; // Default — FLAT interest
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
                contract_id: loanId,
                installment_no: i,
                due_date: dueDate.toISOString().split('T')[0],
                principal_due: Math.round(pp * 100) / 100,
                interest_due: Math.round(interest * 100) / 100,
                total_amount: Math.round((pp + interest) * 100) / 100,
                is_paid: false,
                paid_amount: 0, paid_principal: 0, paid_interest: 0,
                penalty_amount: 0, paid_penalty: 0,
                status: 'SCHEDULED',
                created_at: new Date(),
            });
        }

        // Bulk insert
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

        res.json({ status: true, message: `ສ້າງ ${months} ງວດ ສຳ ເລັດ`, count: months });
    } catch (err) {
        console.error('Generate schedule error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /loan-process/:id/repay
// ບັນ ທຶກ ການ ຊຳ ລະ (CASH ຫຼື QR confirm)
// ═══════════════════════════════════════════════════════
router.post('/loan-process/:id/repay', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const loanId = req.params.id;
        const { scheduleId, principalPaid, interestPaid, penaltyPaid, method } = req.body;

        if (!scheduleId) {
            await t.rollback();
            return res.status(400).json({ status: false, message: 'ຕ້ອງ ລະ ບຸ scheduleId' });
        }

        const totalPaid = (principalPaid || 0) + (interestPaid || 0) + (penaltyPaid || 0);

        // Update schedule row
        await sequelize.query(`
            UPDATE loan_repayment_schedules SET
                is_paid = true,
                paid_amount = :total,
                paid_principal = :pp,
                paid_interest = :pi,
                paid_penalty = :pen,
                status = 'PAID'
            WHERE id = :sid
        `, {
            replacements: { sid: scheduleId, total: totalPaid, pp: principalPaid || 0, pi: interestPaid || 0, pen: penaltyPaid || 0 },
            transaction: t,
        });

        // ─── ບັນ ທຶກ ບັນ ຊີ ตาม ​ຫຼັກ ​ການ ​ລາວ ───
        const loanAccounting = require('../services/loanAccounting.service');
        await loanAccounting.recordRepayment(
            loanId,
            { principalPaid: principalPaid || 0, interestPaid: interestPaid || 0, penaltyPaid: penaltyPaid || 0 },
            `ຮັບ ຊຳ ລະ ສັນ ຍາ #${loanId} (${method || 'CASH'})`,
            req.user?.id,
            t
        );

        // Check if all installments paid → close loan
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
        res.json({
            status: true,
            message: `ຊຳ ລະ ສຳ ເລັດ: ${totalPaid.toLocaleString()} LAK`,
            data: {
                totalPaid,
                remaining: parseInt(remaining[0]?.c),
                journal: 'Debit 110 / Credit 130+410',
            },
        });
    } catch (err) {
        await t.rollback();
        console.error('Repay error:', err);
        res.status(500).json({ status: false, message: err.message });
    }
});

// ═══════════════════════════════════════════════════════
// POST /loan-process/:id/repay-qr
// ສ້າງ QR ສຳ ລັບ ຊຳ ລະ ງວດ
// ═══════════════════════════════════════════════════════
router.post('/loan-process/:id/repay-qr', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const loanId = req.params.id;
        const { scheduleId, amount, mobileNo } = req.body;

        const jdbService = require('../services/jdb.service');
        const billNumber = `REP${loanId}S${scheduleId}T${Date.now()}`.slice(0, 25);

        const qrResult = await jdbService.generateQR({
            amount: parseFloat(amount),
            billNumber,
            mobileNo: mobileNo || '2000000000',
        });

        // Save to jdb_transactions
        await sequelize.query(`
            INSERT INTO jdb_transactions ("requestId", "billNumber", "txnAmount", "status",
                "transactionType", currency, "createdAt", "updatedAt", emv)
            VALUES (:reqId, :bill, :amount, 'PENDING', 'REPAYMENT', 'LAK', NOW(), NOW(), :emv)
        `, {
            replacements: {
                reqId: `REP-${loanId}-${scheduleId}`,
                bill: billNumber,
                amount,
                emv: qrResult.emv,
            },
        });

        res.json({
            status: true,
            data: { billNumber, qrImage: qrResult.qrImage, emv: qrResult.emv },
        });
    } catch (err) {
        res.status(502).json({ status: false, message: `JDB Error: ${err.message}` });
    }
});

module.exports = router;
