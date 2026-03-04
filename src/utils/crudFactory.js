/**
 * crudFactory.js — Factory to generate CRUD controller + router for any Sequelize model
 *
 * Supports BOTH frontend API patterns:
 *   Pattern A (Legacy):  GET /name/read, POST /name/readone, GET /name/get, etc.
 *   Pattern B (RTK CRUD): GET /name, POST /name, PUT /name/:id, DELETE /name/:id
 *
 * Optionally validates request bodies using Zod schemas.
 */
const express = require('express');

/**
 * Zod validation middleware factory
 * @param {object} zodSchema - Zod schema (createSchema or updateSchema)
 * @returns {Function} Express middleware
 */
function validate(zodSchema) {
    if (!zodSchema) return (req, res, next) => next();

    return (req, res, next) => {
        try {
            const result = zodSchema.safeParse(req.body);
            if (!result.success) {
                const errors = result.error.issues.map(i => ({
                    field: i.path.join('.'),
                    message: i.message,
                }));
                return res.status(400).json({
                    message: 'Validation failed',
                    status: false,
                    errors,
                });
            }
            // Use parsed (coerced) data
            req.body = result.data;
            next();
        } catch (err) {
            // If Zod is not installed or schema is invalid, skip validation
            next();
        }
    };
}

/**
 * Create a generic CRUD controller object for a given Sequelize model
 */
function createController(Model, options = {}) {
    const { includes = [], idField = 'id', viewName = null, sequelize = null } = options;

    const buildInclude = (db) => {
        if (!includes.length) return [];
        return includes.map(inc => {
            if (typeof inc === 'string') {
                return db[inc] ? { model: db[inc] } : null;
            }
            return inc;
        }).filter(Boolean);
    };

    return {
        // GET all records
        getAll: async (req, res) => {
            try {
                let data;
                if (viewName && sequelize) {
                    const { QueryTypes } = require('sequelize');
                    data = await sequelize.query(
                        `SELECT * FROM ${viewName}`,
                        { type: QueryTypes.SELECT }
                    );
                } else {
                    data = await Model.findAll();
                }
                res.status(200).json(data);
            } catch (error) {
                console.error(`Error in getAll:`, error.message);
                res.status(500).json({ message: 'Internal server error', error: error.message });
            }
        },

        // GET all with legacy wrapper { data: [...] }
        getAllWrapped: async (req, res) => {
            try {
                let data;
                if (viewName && sequelize) {
                    const { QueryTypes } = require('sequelize');
                    data = await sequelize.query(
                        `SELECT * FROM ${viewName}`,
                        { type: QueryTypes.SELECT }
                    );
                } else {
                    data = await Model.findAll();
                }
                res.status(200).json({ data, message: 'Select successfully', status: true });
            } catch (error) {
                console.error(`Error in getAllWrapped:`, error.message);
                res.status(500).json({ message: 'Internal server error' });
            }
        },

        // GET by ID
        getById: async (req, res) => {
            try {
                const { id } = req.params;
                const data = await Model.findByPk(id);
                if (!data) return res.status(404).json({ message: 'Not found', status: false });
                res.status(200).json({ data, message: 'Select by ID successfully', status: true });
            } catch (error) {
                console.error(`Error in getById:`, error.message);
                res.status(500).json({ message: 'Internal server error' });
            }
        },

        // POST get by criteria (legacy readone) — returns ONE record
        getByOne: async (req, res) => {
            try {
                const data = await Model.findOne({ where: req.body });
                res.status(200).json({ data, message: 'Select by criteria successfully', status: true });
            } catch (error) {
                console.error(`Error in getByOne:`, error.message);
                res.status(500).json({ message: 'Internal server error' });
            }
        },

        // POST get by FK filter (read_fk) — returns ALL matching records
        getByFK: async (req, res) => {
            try {
                const data = await Model.findAll({ where: req.body });
                res.status(200).json({ data, message: 'Select by FK successfully', status: true });
            } catch (error) {
                console.error(`Error in getByFK:`, error.message);
                res.status(500).json({ message: 'Internal server error' });
            }
        },

        // POST create
        create: async (req, res) => {
            try {
                const data = await Model.create(req.body);
                res.status(201).json(data);
            } catch (error) {
                console.error(`Error in create:`, error.message);
                if (error.name === 'SequelizeUniqueConstraintError') {
                    return res.status(400).json({ message: 'ຂໍ້ມູນຊ້ຳກັນ (Duplicate)', error: error.errors?.[0]?.message || error.message });
                }
                res.status(500).json({ message: 'Internal server error', error: error.message });
            }
        },

        // POST create with legacy wrapper
        createWrapped: async (req, res) => {
            try {
                const data = await Model.create(req.body);
                res.status(201).json({ data, message: 'Create successfully', status: true });
            } catch (error) {
                console.error(`Error in createWrapped:`, error.message);
                res.status(500).json({ message: 'Internal server error', error: error.message });
            }
        },

        // PUT update by :id
        update: async (req, res) => {
            try {
                const id = req.params.id || req.body[idField] || req.body.id;
                if (!id) return res.status(400).json({ message: 'ID is required', status: false });

                const [affected] = await Model.update(req.body, { where: { [idField]: id } });
                if (affected === 0) return res.status(404).json({ message: 'Not found or no change', status: false });
                const updatedData = await Model.findByPk(id);
                res.status(200).json(updatedData);
            } catch (error) {
                console.error(`Error in update:`, error.message);
                res.status(500).json({ message: 'Internal server error', error: error.message });
            }
        },

        // PUT update with legacy wrapper
        updateWrapped: async (req, res) => {
            try {
                const id = req.params.id || req.body[idField] || req.body.id;
                if (!id) return res.status(400).json({ message: 'ID is required', status: false });

                const [affected] = await Model.update(req.body, { where: { [idField]: id } });
                if (affected === 0) return res.status(404).json({ message: 'Not found or no change', status: false });
                const updatedData = await Model.findByPk(id);
                res.status(200).json({ data: updatedData, message: 'Update successfully', status: true });
            } catch (error) {
                console.error(`Error in updateWrapped:`, error.message);
                res.status(500).json({ message: 'Internal server error' });
            }
        },

        // DELETE by :id
        remove: async (req, res) => {
            try {
                const id = req.params.id || req.body[idField] || req.body.id;
                if (!id) return res.status(400).json({ message: 'ID is required', status: false });

                const affected = await Model.destroy({ where: { [idField]: id } });
                if (!affected) return res.status(404).json({ message: 'Not found', status: false });
                res.status(200).json({ message: 'Delete successfully', status: true });
            } catch (error) {
                console.error(`Error in remove:`, error.message);
                if (error.name === 'SequelizeForeignKeyConstraintError') {
                    return res.status(400).json({ message: 'ບໍ່ສາມາດລຶບໄດ້ ເພາະມີຂໍ້ມູນອ້າງອີງ (FK constraint)', error: error.message });
                }
                res.status(500).json({ message: 'Internal server error', error: error.message });
            }
        },
    };
}

/**
 * Create Express router with both legacy and RESTful routes for a model
 * @param {string} urlPath - URL path e.g. "/_careers" or "/loans"
 * @param {object} Model - Sequelize model
 * @param {object} options - { idField, customController, schema }
 */
function createCrudRouter(urlPath, Model, options = {}) {
    const router = express.Router();
    const ctrl = options.customController || createController(Model, options);

    // Extract Zod schemas if provided
    const createValidation = validate(options.schema && options.schema.createSchema);
    const updateValidation = validate(options.schema && options.schema.updateSchema);

    // ===== RESTful pattern (for RTK Query createCrudEndpoints) =====
    router.get(urlPath, ctrl.getAll);                                        // GET /name → array
    router.post(urlPath, createValidation, ctrl.create);                     // POST /name → create
    router.put(urlPath + '/:id', updateValidation, ctrl.update);             // PUT /name/:id → update
    router.delete(urlPath + '/:id', ctrl.remove);                            // DELETE /name/:id → delete

    // ===== Legacy pattern (for React Query hooks) =====
    router.get(urlPath + '/read', ctrl.getAllWrapped);                        // GET /name/read → { data: [] }
    router.get(urlPath + '/get', ctrl.getAllWrapped);                         // GET /name/get  → { data: [] }
    router.get(urlPath + '/getbyid/:id', ctrl.getById);                      // GET /name/getbyid/:id
    router.post(urlPath + '/readone', ctrl.getByOne);                        // POST /name/readone
    router.post(urlPath + '/getbyone', ctrl.getByOne);                       // POST /name/getbyone
    router.post(urlPath + '/create', createValidation, ctrl.createWrapped);   // POST /name/create
    router.put(urlPath + '/update/:id', updateValidation, ctrl.updateWrapped);// PUT /name/update/:id
    router.put(urlPath + '/update', updateValidation, ctrl.updateWrapped);    // PUT /name/update (id in body)
    router.delete(urlPath + '/delete/:id', ctrl.remove);                     // DELETE /name/delete/:id
    router.post(urlPath + '/read_fk', ctrl.getByFK);                         // POST /name/read_fk → filter by FK

    return router;
}

module.exports = { createController, createCrudRouter, validate };
