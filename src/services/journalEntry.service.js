/**
 * journalEntry.service.js — Journal Entry CRUD + Post/Delete
 * ═══════════════════════════════════════════════════════════
 * Methods: list, getById, create, update, post, remove
 */
const { Op } = require('sequelize');
const db = require('../models');
const JournalEntry = db['journal_entries'];
const JournalEntryLine = db['journal_entry_lines'];
const ChartOfAccounts = db['chart_of_accounts'];

class JournalEntryService {
    static async list({ date_from, date_to, status, reference_no, page = 1, limit = 20 }) {
        const where = {};
        if (date_from && date_to) where.transaction_date = { [Op.between]: [date_from, date_to] };
        else if (date_from) where.transaction_date = { [Op.gte]: date_from };
        else if (date_to) where.transaction_date = { [Op.lte]: date_to };
        if (status) where.status = status;
        if (reference_no) where.reference_no = { [Op.iLike]: `%${reference_no}%` };
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { rows, count } = await JournalEntry.findAndCountAll({ where, order: [['transaction_date', 'DESC'], ['id', 'DESC']], limit: parseInt(limit), offset, raw: true });
        return { success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) } };
    }

    static async getById(id) {
        const entry = await JournalEntry.findByPk(id, { raw: true });
        if (!entry) throw Object.assign(new Error('ບໍ່ພົບລາຍການ'), { status: 404 });
        const lines = await JournalEntryLine.findAll({ where: { journal_entry_id: entry.id }, order: [['id', 'ASC']], raw: true });
        const accountIds = [...new Set(lines.map(l => l.account_id))];
        let accountMap = {};
        if (accountIds.length > 0 && ChartOfAccounts) {
            const accounts = await ChartOfAccounts.findAll({ where: { id: accountIds }, raw: true });
            accounts.forEach(a => { accountMap[a.id] = { account_code: a.account_code, account_name: a.account_name_la || a.account_code }; });
        }
        const enrichedLines = lines.map(l => ({ ...l, account_code: accountMap[l.account_id]?.account_code || '', account_name: accountMap[l.account_id]?.account_name || '' }));
        return { success: true, data: { ...entry, lines: enrichedLines } };
    }

    static async create({ transaction_date, reference_no, description, currency_code = 'LAK', exchange_rate = 1, branch_id, lines = [] }) {
        if (!transaction_date) throw Object.assign(new Error('ກະລຸນາລະບຸ ວັນທີ'), { status: 400 });
        if (!lines || lines.length < 2) throw Object.assign(new Error('ຕ້ອງມີ ≥ 2 ບັນທັດ'), { status: 400 });
        let totalDebit = 0, totalCredit = 0;
        for (const l of lines) { totalDebit += parseFloat(l.debit || 0); totalCredit += parseFloat(l.credit || 0); }
        if (Math.abs(totalDebit - totalCredit) > 0.01) throw Object.assign(new Error(`ເດບິດ (${totalDebit.toLocaleString()}) ≠ ເຄຣດິດ (${totalCredit.toLocaleString()})`), { status: 400 });

        const t = await db.sequelize.transaction();
        try {
            const entry = await JournalEntry.create({ transaction_date, reference_no: reference_no || `JE-${Date.now()}`, description: description || '', currency_code, exchange_rate, status: 'DRAFT', total_debit: totalDebit, total_credit: totalCredit, branch_id: branch_id || null, created_by: null }, { transaction: t });
            await JournalEntryLine.bulkCreate(lines.map(l => ({ journal_entry_id: entry.id, account_id: parseInt(l.account_id), description: l.description || '', debit: parseFloat(l.debit || 0), credit: parseFloat(l.credit || 0) })), { transaction: t });
            await t.commit();
            return { success: true, message: 'ບັນທຶກສຳເລັດ', data: { id: entry.id, reference_no: entry.reference_no } };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async update(id, { transaction_date, reference_no, description, currency_code, exchange_rate, branch_id, lines = [] }) {
        const entry = await JournalEntry.findByPk(id);
        if (!entry) throw Object.assign(new Error('ບໍ່ພົບລາຍການ'), { status: 404 });
        if (entry.status !== 'DRAFT') throw Object.assign(new Error('ແກ້ໄດ້ ເມື່ອ ສະຖານະ DRAFT ເທົ່ານັ້ນ'), { status: 400 });
        let totalDebit = 0, totalCredit = 0;
        for (const l of lines) { totalDebit += parseFloat(l.debit || 0); totalCredit += parseFloat(l.credit || 0); }
        if (Math.abs(totalDebit - totalCredit) > 0.01) throw Object.assign(new Error(`ເດບິດ (${totalDebit.toLocaleString()}) ≠ ເຄຣດິດ (${totalCredit.toLocaleString()})`), { status: 400 });

        const t = await db.sequelize.transaction();
        try {
            await entry.update({ transaction_date: transaction_date || entry.transaction_date, reference_no: reference_no || entry.reference_no, description: description !== undefined ? description : entry.description, currency_code: currency_code || entry.currency_code, exchange_rate: exchange_rate || entry.exchange_rate, branch_id: branch_id !== undefined ? branch_id : entry.branch_id, total_debit: totalDebit, total_credit: totalCredit }, { transaction: t });
            await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id }, transaction: t });
            await JournalEntryLine.bulkCreate(lines.map(l => ({ journal_entry_id: entry.id, account_id: parseInt(l.account_id), description: l.description || '', debit: parseFloat(l.debit || 0), credit: parseFloat(l.credit || 0) })), { transaction: t });
            await t.commit();
            return { success: true, message: 'ແກ້ໄຂສຳເລັດ', data: { id: entry.id } };
        } catch (err) { await t.rollback(); throw err; }
    }

    static async post(id) {
        const entry = await JournalEntry.findByPk(id);
        if (!entry) throw Object.assign(new Error('ບໍ່ພົບລາຍການ'), { status: 404 });
        if (entry.status !== 'DRAFT') throw Object.assign(new Error('ລາຍການ ບໍ່ແມ່ນ DRAFT'), { status: 400 });
        await entry.update({ status: 'POSTED', posted_by: null, posted_at: new Date() });
        return { success: true, message: 'ປ່ຽນສະຖານະ ເປັນ POSTED ສຳເລັດ' };
    }

    static async remove(id) {
        const entry = await JournalEntry.findByPk(id);
        if (!entry) throw Object.assign(new Error('ບໍ່ພົບລາຍການ'), { status: 404 });
        if (entry.status !== 'DRAFT') throw Object.assign(new Error('ລຶບໄດ້ ເມື່ອ ສະຖານະ DRAFT ເທົ່ານັ້ນ'), { status: 400 });
        await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id } });
        await entry.destroy();
        return { success: true, message: 'ລຶບສຳເລັດ' };
    }
}

module.exports = JournalEntryService;
