/**
 * crudFactory.js — Factory to generate CRUD controller + router for any Sequelize model
 *
 * Supports BOTH frontend API patterns:
 *   Pattern A (Legacy):  GET /name/read, POST /name/readone, etc.
 *   Pattern B (RESTful):  GET /name, POST /name, PUT /name/:id, DELETE /name/:id
 */
const express = require('express');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { isSharedTable } = require('../middleware/tenantFilter');

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

const SENSITIVE_COLS = ['password_hash', 'reset_token', 'api_key'];

/** Response helpers */
const wrap = (res, code, data, msg) =>
    res.status(code).json({ data, message: msg, status: true });

const sendError = (res, label, error) => {
    console.error(`❌ ${label}:`, error.message);
    if (error.name === 'SequelizeUniqueConstraintError')
        return res.status(400).json({ message: 'ຂໍ້ມູນຊ້ຳກັນ (Duplicate)', status: false, error: error.errors?.[0]?.message });
    if (error.name === 'SequelizeForeignKeyConstraintError')
        return res.status(400).json({ message: 'ບໍ່ສາມາດລຶບໄດ້ (FK constraint)', status: false, error: error.message });
    res.status(500).json({ message: 'Internal server error', status: false, error: error.message });
};

/** Strip sensitive columns from rows */
const stripSensitive = (rows) =>
    rows.map(row => {
        const clean = row.toJSON ? row.toJSON() : { ...row };
        SENSITIVE_COLS.forEach(c => delete clean[c]);
        return clean;
    });

/** Parse pagination from query */
const parsePagination = (query) => {
    const want = !!(query.page || query.pageSize);
    const page = Math.max(parseInt(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize) || 500, 1), 5000);
    return { want, page, pageSize, offset: (page - 1) * pageSize };
};

/** Zod validation middleware */
function validate(zodSchema) {
    if (!zodSchema) return (_req, _res, next) => next();
    return (req, res, next) => {
        const result = zodSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: 'Validation failed', status: false,
                errors: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
            });
        }
        req.body = result.data;
        next();
    };
}

// ═══════════════════════════════════════════
// Org ID Cache (module-level singleton)
// ═══════════════════════════════════════════
const _orgIdCache = {};

async function hasOrgIdColumn(Model, tableName, sequelize, viewName = null) {
    // When using a VIEW, check the VIEW name (not base table)
    const checkName = viewName || tableName;
    if (checkName in _orgIdCache) return _orgIdCache[checkName];
    if (!viewName && Model.rawAttributes?.org_id) return (_orgIdCache[checkName] = true);
    try {
        const seq = sequelize || Model.sequelize;
        if (!seq) return (_orgIdCache[checkName] = false);
        const rows = await seq.query(
            `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='org_id' LIMIT 1`,
            { bind: [checkName], type: QueryTypes.SELECT }
        );
        return (_orgIdCache[checkName] = rows.length > 0);
    } catch {
        return (_orgIdCache[checkName] = false);
    }
}

// ═══════════════════════════════════════════
// Tenant WHERE builder (reusable)
// ═══════════════════════════════════════════

async function tenantCondition(tableName, Model, sequelize, req, viewName = null) {
    if (!req.tenantOrgId) return {};
    if (isSharedTable(tableName)) return {};
    if (!(await hasOrgIdColumn(Model, tableName, sequelize, viewName))) return {};
    return { org_id: req.tenantOrgId };
}

/** Auto-inject org_id + hash password */
async function preprocessBody(req, tableName, Model, sequelize) {
    // Inject org_id
    if (req.tenantOrgId && !req.body.org_id && (await hasOrgIdColumn(Model, tableName, sequelize))) {
        req.body.org_id = req.tenantOrgId;
    }
    // Auto-hash password
    if (tableName === 'users' && req.body.password) {
        req.body.password_hash = await bcrypt.hash(req.body.password, 10);
        delete req.body.password;
    }
}

// ═══════════════════════════════════════════
// CRUD Controller Factory
// ═══════════════════════════════════════════

function createController(Model, options = {}) {
    const { idField = 'id', viewName = null, sequelize = null } = options;
    const hasDeletedAt = !!Model.rawAttributes?.deleted_at;
    const tableName = Model.tableName || '';

    // ── getAll (unified: wrapped=false → array, wrapped=true → {data,message,status}) ──
    const _getAll = async (req, res, wrapped) => {
        try {
            const showDeleted = req.query.show_deleted === 'true';
            const tenant = await tenantCondition(tableName, Model, sequelize, req, viewName);
            const pag = parsePagination(req.query);
            let data, total = null;

            if (viewName && sequelize) {
                const conditions = [];
                const bind = {};
                if (!showDeleted && hasDeletedAt) conditions.push('deleted_at IS NULL');
                if (tenant.org_id) {
                    conditions.push('org_id = $org');
                    bind.org = tenant.org_id;
                }
                const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

                if (pag.want) {
                    const [cnt] = await sequelize.query(`SELECT COUNT(*) as cnt FROM ${viewName} ${where}`, { type: QueryTypes.SELECT, bind });
                    total = parseInt(cnt?.cnt || 0);
                }
                data = await sequelize.query(`SELECT * FROM ${viewName} ${where} LIMIT ${pag.pageSize} OFFSET ${pag.offset}`, { type: QueryTypes.SELECT, bind });
            } else {
                const where = {
                    ...(!showDeleted && hasDeletedAt ? { deleted_at: null } : {}),
                    ...tenant,
                };
                if (pag.want) {
                    const result = await Model.findAndCountAll({ where, limit: pag.pageSize, offset: pag.offset, order: [['id', 'DESC']] });
                    data = result.rows; total = result.count;
                } else {
                    data = await Model.findAll({ where, limit: 5000 });
                }
            }

            data = stripSensitive(Array.isArray(data) ? data : []);

            if (wrapped) return wrap(res, 200, data, 'Select successfully');
            if (pag.want) return res.json({ data, total, page: pag.page, pageSize: pag.pageSize });
            res.json(data);
        } catch (e) { sendError(res, `getAll(${tableName})`, e); }
    };

    // ── getByFK (filter by body fields, supports view) ──
    const _getByFK = async (req, res) => {
        try {
            const tenant = await tenantCondition(tableName, Model, sequelize, req, viewName);
            let data;

            if (viewName && sequelize) {
                const conditions = [];
                const replacements = {};
                Object.entries(req.body).forEach(([key, val], i) => {
                    if (val != null && val !== '') { conditions.push(`${key} = :p${i}`); replacements[`p${i}`] = val; }
                });
                if (tenant.org_id) { conditions.push('org_id = :org'); replacements.org = tenant.org_id; }
                if (hasDeletedAt) conditions.push('deleted_at IS NULL');
                const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
                data = await sequelize.query(`SELECT * FROM ${viewName} ${where}`, { type: QueryTypes.SELECT, replacements });
            } else {
                data = await Model.findAll({ where: { ...req.body, ...tenant } });
            }
            wrap(res, 200, data, 'Select by FK successfully');
        } catch (e) { sendError(res, `getByFK(${tableName})`, e); }
    };

    return {
        getAll: (req, res) => _getAll(req, res, false),
        getAllWrapped: (req, res) => _getAll(req, res, true),

        getById: async (req, res) => {
            try {
                const tenant = await tenantCondition(tableName, Model, sequelize, req);
                const data = await Model.findOne({ where: { [idField]: req.params.id, ...tenant } });
                if (!data) return res.status(404).json({ message: 'Not found', status: false });
                wrap(res, 200, data, 'Select by ID successfully');
            } catch (e) { sendError(res, `getById(${tableName})`, e); }
        },

        getByOne: async (req, res) => {
            try {
                const tenant = await tenantCondition(tableName, Model, sequelize, req);
                const data = await Model.findOne({ where: { ...req.body, ...tenant } });
                wrap(res, 200, data, 'Select by criteria successfully');
            } catch (e) { sendError(res, `getByOne(${tableName})`, e); }
        },

        getByFK: _getByFK,

        // ── Create (unified) ──
        create: async (req, res, wrapped = false) => {
            try {
                await preprocessBody(req, tableName, Model, sequelize);
                const data = await Model.create(req.body);
                wrapped ? wrap(res, 201, data, 'Create successfully') : res.status(201).json(data);
            } catch (e) { sendError(res, `create(${tableName})`, e); }
        },
        createWrapped: async (req, res) => {
            try {
                await preprocessBody(req, tableName, Model, sequelize);
                const data = await Model.create(req.body);
                wrap(res, 201, data, 'Create successfully');
            } catch (e) { sendError(res, `create(${tableName})`, e); }
        },

        // ── Update (unified) ──
        update: async (req, res, wrapped = false) => {
            try {
                const id = req.params.id || req.body[idField] || req.body.id;
                if (!id) return res.status(400).json({ message: 'ID is required', status: false });
                await preprocessBody(req, tableName, Model, sequelize);
                const tenant = await tenantCondition(tableName, Model, sequelize, req);
                const [affected] = await Model.update(req.body, { where: { [idField]: id, ...tenant } });
                if (!affected) return res.status(404).json({ message: 'Not found or no change', status: false });
                const updated = await Model.findOne({ where: { [idField]: id, ...tenant } });
                wrapped ? wrap(res, 200, updated, 'Update successfully') : res.json(updated);
            } catch (e) { sendError(res, `update(${tableName})`, e); }
        },
        updateWrapped: async (req, res) => {
            try {
                const id = req.params.id || req.body[idField] || req.body.id;
                if (!id) return res.status(400).json({ message: 'ID is required', status: false });
                await preprocessBody(req, tableName, Model, sequelize);
                const tenant = await tenantCondition(tableName, Model, sequelize, req);
                const [affected] = await Model.update(req.body, { where: { [idField]: id, ...tenant } });
                if (!affected) return res.status(404).json({ message: 'Not found or no change', status: false });
                const updated = await Model.findOne({ where: { [idField]: id, ...tenant } });
                wrap(res, 200, updated, 'Update successfully');
            } catch (e) { sendError(res, `update(${tableName})`, e); }
        },

        // ── Delete (soft/hard) ──
        remove: async (req, res) => {
            try {
                const id = req.params.id || req.body[idField] || req.body.id;
                if (!id) return res.status(400).json({ message: 'ID is required', status: false });
                const tenant = await tenantCondition(tableName, Model, sequelize, req);
                if (hasDeletedAt) {
                    const [n] = await Model.update({ deleted_at: new Date() }, { where: { [idField]: id, deleted_at: null, ...tenant } });
                    if (!n) return res.status(404).json({ message: 'Not found or already deleted', status: false });
                    return res.json({ message: 'Soft delete successfully', status: true });
                }
                const n = await Model.destroy({ where: { [idField]: id, ...tenant } });
                if (!n) return res.status(404).json({ message: 'Not found', status: false });
                res.json({ message: 'Delete successfully', status: true });
            } catch (e) { sendError(res, `remove(${tableName})`, e); }
        },

        // ── Restore ──
        restore: async (req, res) => {
            try {
                const id = req.params.id;
                if (!id) return res.status(400).json({ message: 'ID is required', status: false });
                if (!hasDeletedAt) return res.status(400).json({ message: 'Model does not support soft delete', status: false });
                const [n] = await Model.update({ deleted_at: null }, { where: { [idField]: id } });
                if (!n) return res.status(404).json({ message: 'Not found', status: false });
                res.json({ message: 'Restore successfully', status: true });
            } catch (e) { sendError(res, `restore(${tableName})`, e); }
        },
    };
}

// ═══════════════════════════════════════════
// Router Factory
// ═══════════════════════════════════════════

function createCrudRouter(urlPath, Model, options = {}) {
    const router = express.Router();
    const ctrl = options.customController || createController(Model, options);
    const vCreate = validate(options.schema?.createSchema);
    const vUpdate = validate(options.schema?.updateSchema);

    // RESTful
    router.get(urlPath, ctrl.getAll);
    router.post(urlPath, vCreate, ctrl.create);
    router.put(urlPath + '/:id', vUpdate, ctrl.update);
    router.delete(urlPath + '/:id', ctrl.remove);
    router.put(urlPath + '/:id/restore', ctrl.restore);

    // Legacy
    router.get(urlPath + '/read', ctrl.getAllWrapped);
    router.get(urlPath + '/get', ctrl.getAllWrapped);
    router.get(urlPath + '/getbyid/:id', ctrl.getById);
    router.post(urlPath + '/readone', ctrl.getByOne);
    router.post(urlPath + '/getbyone', ctrl.getByOne);
    router.post(urlPath + '/create', vCreate, ctrl.createWrapped);
    router.put(urlPath + '/update/:id', vUpdate, ctrl.updateWrapped);
    router.put(urlPath + '/update', vUpdate, ctrl.updateWrapped);
    router.delete(urlPath + '/delete/:id', ctrl.remove);
    router.put(urlPath + '/restore/:id', ctrl.restore);
    router.post(urlPath + '/read_fk', ctrl.getByFK);

    return router;
}

module.exports = { createController, createCrudRouter, validate };
