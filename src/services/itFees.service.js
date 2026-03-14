/**
 * itFees.service.js — IT fee configs, charge, history, summary
 */
const db = require('../models');
const logger = require('../config/logger');
const seq = db.sequelize;

class ItFeesService {
    static async getConfigs() { const [r] = await seq.query(`SELECT * FROM it_fee_configs ORDER BY id`); return { status: true, data: r }; }
    static async updateConfig(id, body) {
        const { fee_name, calc_method, rate, fixed_amount, min_amount, max_amount, is_active, description } = body;
        await seq.query(`UPDATE it_fee_configs SET fee_name=COALESCE($1,fee_name), calc_method=COALESCE($2,calc_method), rate=COALESCE($3,rate), fixed_amount=COALESCE($4,fixed_amount), min_amount=COALESCE($5,min_amount), max_amount=COALESCE($6,max_amount), is_active=COALESCE($7,is_active), description=COALESCE($8,description), updated_at=NOW() WHERE id=$9`, { bind: [fee_name, calc_method, rate, fixed_amount, min_amount, max_amount, is_active, description, id] });
        const [u] = await seq.query(`SELECT * FROM it_fee_configs WHERE id = $1`, { bind: [id] }); return { status: true, message: 'ອັບເດດສຳເລັດ', data: u[0] };
    }
    static async charge(body, userId) {
        const { fee_type, amount, loan_id, mfi_id, notes, billing_period } = body;
        const [cs] = await seq.query(`SELECT * FROM it_fee_configs WHERE fee_type = $1 AND is_active = true`, { bind: [fee_type] });
        if (!cs.length) throw Object.assign(new Error(`${fee_type} ບໍ່ພົບ ຫຼື ປິດ`), { status: 400 });
        const c = cs[0]; let f = 0;
        if (c.calc_method === 'PERCENT') { if (!amount) throw Object.assign(new Error('ຕ້ອງລະບຸ amount'), { status: 400 }); f = parseFloat(amount)*parseFloat(c.rate); if (+c.min_amount > 0) f = Math.max(f, +c.min_amount); if (+c.max_amount > 0) f = Math.min(f, +c.max_amount); }
        else if (c.calc_method === 'FIXED') f = parseFloat(c.fixed_amount);
        else { if (!amount) throw Object.assign(new Error('ຕ້ອງລະບຸ amount'), { status: 400 }); f = parseFloat(amount); }
        f = Math.round(f*100)/100;
        await seq.query(`INSERT INTO loan_fees (loan_id, fee_type, fee_amount, notes, mfi_id, fee_config_id, billing_period, charged_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`, { bind: [loan_id||null, fee_type, f, notes||c.fee_name, mfi_id||null, c.id, billing_period||null, userId] });
        logger.info(`💰 IT Fee: ${fee_type} = ${f}₭`);
        return { status: true, message: `ເກັບ ${c.fee_name}: ${f.toLocaleString()}₭`, data: { fee_type, fee_amount: f, config_id: c.id } };
    }
    static async history(query) {
        const { fee_type, billing_period, limit = 100, offset = 0 } = query;
        let w = `WHERE lf.fee_type LIKE 'IT_%'`, b = [], i = 1;
        if (fee_type) { w += ` AND lf.fee_type = $${i++}`; b.push(fee_type); }
        if (billing_period) { w += ` AND lf.billing_period = $${i++}`; b.push(billing_period); }
        const [rows] = await seq.query(`SELECT lf.*, ifc.fee_name, ifc.calc_method FROM loan_fees lf LEFT JOIN it_fee_configs ifc ON ifc.fee_type = lf.fee_type ${w} ORDER BY lf.created_at DESC LIMIT $${i++} OFFSET $${i++}`, { bind: [...b, +limit, +offset] });
        const [cnt] = await seq.query(`SELECT COUNT(*) as total FROM loan_fees lf ${w}`, { bind: b });
        return { status: true, data: rows, total: parseInt(cnt[0].total) };
    }
    static async summary(period) {
        let pf = '', b = []; if (period) { pf = `AND (lf.billing_period = $1 OR TO_CHAR(lf.created_at, 'YYYY-MM') = $1)`; b.push(period); }
        const [rows] = await seq.query(`SELECT lf.fee_type, ifc.fee_name, COUNT(*) as total_count, SUM(lf.fee_amount) as total_amount, AVG(lf.fee_amount) as avg_amount, MIN(lf.fee_amount) as min_charged, MAX(lf.fee_amount) as max_charged FROM loan_fees lf LEFT JOIN it_fee_configs ifc ON ifc.fee_type = lf.fee_type WHERE lf.fee_type LIKE 'IT_%' ${pf} GROUP BY lf.fee_type, ifc.fee_name ORDER BY total_amount DESC`, { bind: b });
        const [gt] = await seq.query(`SELECT COUNT(*) as total_transactions, COALESCE(SUM(fee_amount),0) as total_revenue FROM loan_fees WHERE fee_type LIKE 'IT_%' ${pf}`, { bind: b });
        return { status: true, data: rows, summary: { total_transactions: +gt[0].total_transactions, total_revenue: +gt[0].total_revenue, period: period || 'ທັງໝົດ' } };
    }
}

module.exports = ItFeesService;
