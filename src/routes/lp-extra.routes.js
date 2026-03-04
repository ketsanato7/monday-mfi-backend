/**
 * lp-extra.routes.js — LP Process missing APIs
 * X2.1: Group Registration (LP1c)
 * X2.2: Blacklist Check (LP2)
 * X2.3: IIF Import placeholder
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const seq = db.sequelize;
const { requirePermission } = require('../middleware/rbac');

// ═══════════════════════════════════════════
// X2.1: Group Registration (LP1c)
// ═══════════════════════════════════════════

// POST /group-register — create group + link members
router.post('/group-register', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    const t = await seq.transaction();
    try {
        const { groupName, villageId, memberIds = [] } = req.body;
        if (!groupName) { await t.rollback(); return res.json({ status: false, message: 'groupName required' }); }

        const [result] = await seq.query(
            `INSERT INTO individual_groups (group_name, village_id, created_at) VALUES ($1, $2, NOW()) RETURNING id`,
            { bind: [groupName, villageId || null], transaction: t }
        );
        const groupId = result[0].id;

        // Link members to group (via borrowers_individual.group_id if exists)
        if (memberIds.length > 0) {
            for (const mid of memberIds) {
                await seq.query(
                    `UPDATE borrowers_individual SET group_id = $1 WHERE personal_info_id = $2`,
                    { bind: [groupId, mid], transaction: t }
                );
            }
        }

        await t.commit();
        res.json({ status: true, message: `ກຸ່ມ "${groupName}" ສ້າງແລ້ວ (${memberIds.length} ສະມາຊິກ)`, data: { groupId } });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ status: false, message: e.message });
    }
});

// GET /group-register — list groups
router.get('/group-register', async (_req, res) => {
    try {
        const rows = await seq.query(`
            SELECT ig.*, v.value AS village_name
            FROM individual_groups ig
            LEFT JOIN villages v ON v.id = ig.village_id
            ORDER BY ig.id DESC
        `, { type: seq.QueryTypes.SELECT });
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// X2.2: Blacklist Check (LP2)
// ═══════════════════════════════════════════

// POST /loan-process/blacklist-check — check if customer is blacklisted
router.post('/loan-process/blacklist-check', requirePermission('ເບິ່ງສິນເຊື່ອ'), async (req, res) => {
    try {
        const { customerId, firstName, lastName, idCardNo } = req.body;
        if (!customerId && !firstName && !idCardNo) {
            return res.json({ status: false, message: 'ຕ້ອງລະບຸ customerId, ຊື່, ຫຼື ເລກບັດ' });
        }

        let where = 'cb.is_active = true';
        const binds = [];

        if (customerId) {
            binds.push(customerId);
            where += ` AND cb.customer_id = $${binds.length}`;
        }

        const blacklisted = await seq.query(`
            SELECT cb.*, pi.firstname__la, pi.lastname__la
            FROM customer_blacklists cb
            LEFT JOIN personal_info pi ON pi.id = cb.customer_id
            WHERE ${where}
            ORDER BY cb.blacklisted_date DESC
        `, { bind: binds, type: seq.QueryTypes.SELECT });

        // Also check by name if provided
        let nameMatch = [];
        if (firstName || lastName) {
            let nameWhere = 'cb.is_active = true';
            const nameBinds = [];
            if (firstName) {
                nameBinds.push(`%${firstName}%`);
                nameWhere += ` AND pi.firstname__la ILIKE $${nameBinds.length}`;
            }
            if (lastName) {
                nameBinds.push(`%${lastName}%`);
                nameWhere += ` AND pi.lastname__la ILIKE $${nameBinds.length}`;
            }
            nameMatch = await seq.query(`
                SELECT cb.*, pi.firstname__la, pi.lastname__la
                FROM customer_blacklists cb
                JOIN personal_info pi ON pi.id = cb.customer_id
                WHERE ${nameWhere}
            `, { bind: nameBinds, type: seq.QueryTypes.SELECT });
        }

        const allMatches = [...blacklisted, ...nameMatch];
        const isBlacklisted = allMatches.length > 0;

        res.json({
            status: true,
            blacklisted: isBlacklisted,
            matches: allMatches.length,
            data: allMatches,
            message: isBlacklisted
                ? `⛔ ພົບ ${allMatches.length} ລາຍການໃນບັນຊີດຳ`
                : '✅ ບໍ່ຢູ່ໃນບັນຊີດຳ — ສາມາດດຳເນີນການໄດ້'
        });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// POST /customer-blacklist — add to blacklist
router.post('/customer-blacklist', requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    try {
        const { customerId, customerType = 'INDIVIDUAL', reason, blacklistedBy } = req.body;
        if (!customerId || !reason) return res.json({ status: false, message: 'customerId and reason required' });

        await seq.query(`
            INSERT INTO customer_blacklists (customer_id, customer_type, reason, blacklisted_by, blacklisted_date, is_active, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, NOW(), true, NOW(), NOW())
        `, { bind: [customerId, customerType, reason, blacklistedBy || null] });

        res.json({ status: true, message: `ເພີ່ມ ລູກຄ້າ #${customerId} ເຂົ້າ ບັນຊີດຳ ແລ້ວ` });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// ═══════════════════════════════════════════
// X2.3: IIF Import (placeholder)
// ═══════════════════════════════════════════

// GET /iif/headers — list imported IIF files
router.get('/iif/headers', async (_req, res) => {
    try {
        const rows = await seq.query(`SELECT * FROM iif_headers ORDER BY id DESC`, { type: seq.QueryTypes.SELECT });
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// POST /iif/import — import IIF text file (pipe-delimited)
router.post('/iif/import', requirePermission('ສ້າງສິນເຊື່ອ'), async (req, res) => {
    const t = await seq.transaction();
    try {
        const { fileContent, orgCode = '102', reportDate } = req.body;
        if (!fileContent) { await t.rollback(); return res.json({ status: false, message: 'fileContent required' }); }

        const lines = fileContent.split('\n').filter((l) => l.trim());
        if (lines.length === 0) { await t.rollback(); return res.json({ status: false, message: 'Empty file' }); }

        // Create header record
        const [hdr] = await seq.query(
            `INSERT INTO iif_headers (org_code, report_date, total_records, file_name, status, created_at)
             VALUES ($1, $2, $3, $4, 'IMPORTED', NOW()) RETURNING id`,
            { bind: [orgCode, reportDate || new Date().toISOString().split('T')[0], lines.length, `IIF_${orgCode}_import`], transaction: t }
        );
        const headerId = hdr[0].id;

        let imported = { individuals: 0, loans: 0 };

        // Parse pipe-delimited lines
        for (const line of lines) {
            const fields = line.split('|');
            if (fields.length < 3) continue;

            const recordType = fields[0];
            if (recordType === 'A1') {
                // Individual detail
                await seq.query(
                    `INSERT INTO iif_individual_details (header_id, id_number, first_name, last_name, gender, date_of_birth, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    { bind: [headerId, fields[1] || null, fields[2] || null, fields[3] || null, fields[4] || null, fields[5] || null], transaction: t }
                );
                imported.individuals++;
            } else if (recordType === 'B1') {
                // Loan detail
                await seq.query(
                    `INSERT INTO iif_loan_details (header_id, contract_number, loan_amount, interest_rate, start_date, maturity_date, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    { bind: [headerId, fields[1] || null, fields[2] || 0, fields[3] || 0, fields[4] || null, fields[5] || null], transaction: t }
                );
                imported.loans++;
            }
        }

        await t.commit();
        res.json({
            status: true,
            message: `ນຳເຂົ້າ IIF ສຳເລັດ: ${imported.individuals} ບຸກຄົນ, ${imported.loans} ສິນເຊື່ອ`,
            data: { headerId, ...imported }
        });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ status: false, message: e.message });
    }
});

module.exports = router;
