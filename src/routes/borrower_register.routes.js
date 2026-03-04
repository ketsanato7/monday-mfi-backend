/**
 * Borrower Registration Route
 * ── ລົງທະບຽນຜູ້ກູ້ໃໝ່ ──
 * 
 * POST /borrowers_individual/register
 * --------------------------------------------------------
 * ຮັບ { personal_info, borrower } ຈາກ frontend
 * ⇒ insert ໃສ່ borrowers_individual table ໂດຍກົງ
 *   (ເພາະ table ມີ columns ສຳລັບ personal_info ທັງໝົດ ໃນ table ດຽວ)
 */
const express = require('express');
const router = express.Router();
const db = require('../models/index');
const { requirePermission } = require('../middleware/rbac');

// Helper: ແປງ date DD/MM/YYYY → YYYY-MM-DD ສຳລັບ PostgreSQL
function parseDate(val) {
    if (!val) return null;
    // ຖ້າ format DD/MM/YYYY
    const parts = String(val).split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
    }
    return val; // ສົ່ງ ISO format ກັບຄືນ
}

// Helper: ແປງ ID ເປັນ integer ຫຼື null
function toInt(val) {
    if (val == null || val === '' || val === 'null') return null;
    if (typeof val === 'object') return parseInt(val._id || val.id || val.value) || null;
    const n = parseInt(val);
    return isNaN(n) ? null : n;
}

router.post('/borrowers_individual/register', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    try {
        const { personal_info = {}, borrower = {} } = req.body;
        // ລວມ data ຈາກ personal_info ແລະ borrower
        const merged = { ...personal_info, ...borrower };

        // ── ກວດ fields ທີ່ຈຳເປັນ ──
        if (!merged.firstname_LA && !merged.firstname_la) {
            return res.status(400).json({ error: 'ຕ້ອງລະບຸຊື່ (firstname_LA)' });
        }

        // ── ຫາ borrower_id ໃໝ່ ──
        const maxResult = await db.sequelize.query(
            `SELECT COALESCE(MAX(borrower_id), 0) + 1 as next_id FROM borrowers_individual`,
            { type: db.sequelize.QueryTypes.SELECT }
        );
        const nextBorrowerId = maxResult[0]?.next_id || 1;

        // ── ສ້າງ payload ທີ່ match columns ໃນ DB ──
        const payload = {
            borrower_id: nextBorrowerId,
            loan_id: 0,  // ຍັງບໍ່ມີ loan (ຈະ update ຕອນສ້າງສັນຍາ)
            personal_info_id: toInt(merged.personal_info_id) || null,
            // ── ຊື່ (ເກັບ 2 ແບບ ເພື່ອ compatibility) ──
            firstname__l_a: merged.firstname_LA || merged.firstname_la || '',
            lastname__l_a: merged.lastname_LA || merged.lastname_la || '',
            firstname__e_n: merged.firstname_EN || merged.firstname_en || '',
            lastname__e_n: merged.lastname_EN || merged.lastname_en || '',
            firstname_la: merged.firstname_LA || merged.firstname_la || '',
            lastname_la: merged.lastname_LA || merged.lastname_la || '',
            firstname_en: merged.firstname_EN || merged.firstname_en || '',
            lastname_en: merged.lastname_EN || merged.lastname_en || '',
            // ── ວັນເດືອນປີ ──
            dateofbirth: parseDate(merged.dateofbirth),
            // ── FK IDs ──
            gender_id: toInt(merged.gender_id),
            nationality_id: toInt(merged.nationality_id),
            marital_status_id: toInt(merged.marital_status_id),
            career_id: toInt(merged.career_id),
            village_id: toInt(merged.village_id),
            country_id: toInt(merged.country_id),
            // ── ຂໍ້ມູນຕິດຕໍ່ ──
            home_address: merged.home_address || '',
            contact_info: merged.contact_info || '',
            mobile_no: merged.mobile_no || '',
            telephone_no: merged.telephone_no || '',
            // ── ບັດປະຈຳຕົວ ──
            card_id: toInt(merged.card_id),
            card_no: merged.card_no || null,
            card_name: merged.card_name || null,
            card_date_of_issue: parseDate(merged.card_date_of_issue),
            card_exp_date: parseDate(merged.card_exp_date),
            // ── ຜົວ/ເມຍ ──
            spouse_id: toInt(merged.spouse_id),
            spouse_name_1st__e_n: merged.spouse_name_1st_EN || null,
            spouse_surname__e_n: merged.spouse_surname_EN || null,
            spouse_name__l_a: merged.spouse_name_LA || null,
            spouse_surname__l_a: merged.spouse_surname_LA || null,
            spouse_name_1st_en: merged.spouse_name_1st_EN || null,
            spouse_surname_en: merged.spouse_surname_EN || null,
            spouse_name_la: merged.spouse_name_LA || null,
            spouse_surname_la: merged.spouse_surname_LA || null,
            spouse_mobile_no: merged.spouse_mobile_no || null,
            // ── ສຳມະໂນ ──
            book_id: toInt(merged.book_id),
            book_no: merged.book_no || null,
            book_name: merged.book_name || null,
            book_date_of_issue: parseDate(merged.book_date_of_issue),
            book_village_id: toInt(merged.book_village_id),
            // ── Passport ──
            passport_id: toInt(merged.passport_id),
            passport_no: merged.passport_no || null,
            passport_name: merged.passport_name || null,
            passport_exp_date: parseDate(merged.passport_exp_date),
        };

        // ── INSERT ──
        const result = await db.sequelize.query(
            `INSERT INTO borrowers_individual (
                borrower_id, loan_id, personal_info_id,
                firstname__l_a, lastname__l_a, firstname__e_n, lastname__e_n,
                firstname_la, lastname_la, firstname_en, lastname_en,
                dateofbirth, gender_id, nationality_id, marital_status_id,
                career_id, village_id, country_id,
                home_address, contact_info, mobile_no, telephone_no,
                card_id, card_no, card_name, card_date_of_issue, card_exp_date,
                spouse_id, spouse_name_1st__e_n, spouse_surname__e_n,
                spouse_name__l_a, spouse_surname__l_a,
                spouse_name_1st_en, spouse_surname_en, spouse_name_la, spouse_surname_la,
                spouse_mobile_no,
                book_id, book_no, book_name, book_date_of_issue, book_village_id,
                passport_id, passport_no, passport_name, passport_exp_date
            ) VALUES (
                :borrower_id, :loan_id, :personal_info_id,
                :firstname__l_a, :lastname__l_a, :firstname__e_n, :lastname__e_n,
                :firstname_la, :lastname_la, :firstname_en, :lastname_en,
                :dateofbirth, :gender_id, :nationality_id, :marital_status_id,
                :career_id, :village_id, :country_id,
                :home_address, :contact_info, :mobile_no, :telephone_no,
                :card_id, :card_no, :card_name, :card_date_of_issue, :card_exp_date,
                :spouse_id, :spouse_name_1st__e_n, :spouse_surname__e_n,
                :spouse_name__l_a, :spouse_surname__l_a,
                :spouse_name_1st_en, :spouse_surname_en, :spouse_name_la, :spouse_surname_la,
                :spouse_mobile_no,
                :book_id, :book_no, :book_name, :book_date_of_issue, :book_village_id,
                :passport_id, :passport_no, :passport_name, :passport_exp_date
            ) RETURNING *`,
            {
                replacements: payload,
                type: db.sequelize.QueryTypes.INSERT,
            }
        );

        const created = result[0]?.[0] || result[0] || payload;
        console.log(`✅ ລົງທະບຽນຜູ້ກູ້ໃໝ່ສຳເລັດ: ${payload.firstname__l_a} ${payload.lastname__l_a} (borrower_id: ${nextBorrowerId})`);

        res.status(201).json({
            message: 'ລົງທະບຽນສຳເລັດ',
            data: created,
            borrower_id: nextBorrowerId,
        });
    } catch (err) {
        console.error('❌ Register error:', err);
        res.status(500).json({
            error: err.message || 'Internal server error',
            details: err.original?.detail || null,
        });
    }
});

module.exports = router;
