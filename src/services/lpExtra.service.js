/**
 * lpExtra.service.js — Group registration, blacklist check, IIF import
 */
const db = require('../models');
const seq = db.sequelize;

class LpExtraService {
    static async createGroup(body) {
        const { groupName, villageId, memberIds = [] } = body;
        if (!groupName) throw Object.assign(new Error('groupName required'), { status: 400 });
        const t = await seq.transaction();
        try {
            const [r] = await seq.query(`INSERT INTO individual_groups (group_name, village_id, created_at) VALUES ($1, $2, NOW()) RETURNING id`, { bind: [groupName, villageId || null], transaction: t });
            const gid = r[0].id;
            for (const mid of memberIds) await seq.query(`UPDATE borrowers_individual SET group_id = $1 WHERE personal_info_id = $2`, { bind: [gid, mid], transaction: t });
            await t.commit();
            return { status: true, message: `ກຸ່ມ "${groupName}" ສ້າງແລ້ວ (${memberIds.length} ສະມາຊິກ)`, data: { groupId: gid } };
        } catch (e) { await t.rollback(); throw e; }
    }
    static async listGroups() { return { status: true, data: await seq.query(`SELECT ig.*, v.value AS village_name FROM individual_groups ig LEFT JOIN villages v ON v.id = ig.village_id ORDER BY ig.id DESC`, { type: seq.QueryTypes.SELECT }) }; }
    static async blacklistCheck(body) {
        const { customerId, firstName, lastName } = body;
        if (!customerId && !firstName) throw Object.assign(new Error('ຕ້ອງລະບຸ customerId ຫຼື ຊື່'), { status: 400 });
        let w = 'cb.is_active = true', b = [];
        if (customerId) { b.push(customerId); w += ` AND cb.customer_id = $${b.length}`; }
        const matches = await seq.query(`SELECT cb.*, pi.firstname__la, pi.lastname__la FROM customer_blacklists cb LEFT JOIN personal_info pi ON pi.id = cb.customer_id WHERE ${w} ORDER BY cb.blacklisted_date DESC`, { bind: b, type: seq.QueryTypes.SELECT });
        let nameMatch = [];
        if (firstName || lastName) { let nw = 'cb.is_active = true'; const nb = []; if (firstName) { nb.push(`%${firstName}%`); nw += ` AND pi.firstname__la ILIKE $${nb.length}`; } if (lastName) { nb.push(`%${lastName}%`); nw += ` AND pi.lastname__la ILIKE $${nb.length}`; } nameMatch = await seq.query(`SELECT cb.*, pi.firstname__la, pi.lastname__la FROM customer_blacklists cb JOIN personal_info pi ON pi.id = cb.customer_id WHERE ${nw}`, { bind: nb, type: seq.QueryTypes.SELECT }); }
        const all = [...matches, ...nameMatch]; const is = all.length > 0;
        return { status: true, blacklisted: is, matches: all.length, data: all, message: is ? `⛔ ພົບ ${all.length} ລາຍການໃນບັນຊີດຳ` : '✅ ບໍ່ຢູ່ໃນບັນຊີດຳ' };
    }
    static async addBlacklist(body) {
        const { customerId, customerType = 'INDIVIDUAL', reason, blacklistedBy } = body;
        if (!customerId || !reason) throw Object.assign(new Error('customerId and reason required'), { status: 400 });
        await seq.query(`INSERT INTO customer_blacklists (customer_id, customer_type, reason, blacklisted_by, blacklisted_date, is_active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), true, NOW(), NOW())`, { bind: [customerId, customerType, reason, blacklistedBy || null] });
        return { status: true, message: `ເພີ່ມ #${customerId} ເຂົ້າບັນຊີດຳ` };
    }
    static async listIifHeaders() { return { status: true, data: await seq.query(`SELECT * FROM iif_headers ORDER BY id DESC`, { type: seq.QueryTypes.SELECT }) }; }
    static async importIif(body) {
        const { fileContent, orgCode = '102', reportDate } = body;
        if (!fileContent) throw Object.assign(new Error('fileContent required'), { status: 400 });
        const lines = fileContent.split('\n').filter(l => l.trim()); if (!lines.length) throw new Error('Empty file');
        const t = await seq.transaction();
        try {
            const [h] = await seq.query(`INSERT INTO iif_headers (org_code, report_date, total_records, file_name, status, created_at) VALUES ($1, $2, $3, $4, 'IMPORTED', NOW()) RETURNING id`, { bind: [orgCode, reportDate || new Date().toISOString().split('T')[0], lines.length, `IIF_${orgCode}_import`], transaction: t });
            const hid = h[0].id; let imp = { individuals: 0, loans: 0 };
            for (const line of lines) { const f = line.split('|'); if (f.length < 3) continue; if (f[0] === 'A1') { await seq.query(`INSERT INTO iif_individual_details (header_id, id_number, first_name, last_name, gender, date_of_birth, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`, { bind: [hid, f[1]||null, f[2]||null, f[3]||null, f[4]||null, f[5]||null], transaction: t }); imp.individuals++; } else if (f[0] === 'B1') { await seq.query(`INSERT INTO iif_loan_details (header_id, contract_number, loan_amount, interest_rate, start_date, maturity_date, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`, { bind: [hid, f[1]||null, f[2]||0, f[3]||0, f[4]||null, f[5]||null], transaction: t }); imp.loans++; } }
            await t.commit();
            return { status: true, message: `ນຳເຂົ້າ IIF: ${imp.individuals} ບຸກຄົນ, ${imp.loans} ສິນເຊື່ອ`, data: { headerId: hid, ...imp } };
        } catch (e) { await t.rollback(); throw e; }
    }
}

module.exports = LpExtraService;
