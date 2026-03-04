const { createCrudRouter } = require('../utils/crudFactory');
const db = require('../models');
const schemas = require('../schemas');
const express = require('express');

// Alias routes for frontend compatibility (plural/alternative paths)
const routers = [
    createCrudRouter('/personal_infos', db['personal_info'], { schema: schemas['personal_info'] }),
    createCrudRouter('/enterprise_infos', db['enterprise_info'], { schema: schemas['enterprise_info'] }),
    createCrudRouter('/mfi_infos', db['mfi_info'], { schema: schemas['mfi_info'] }),
    createCrudRouter('/mfi_branches_infos', db['mfi_branches_info'], { schema: schemas['mfi_branches_info'] }),
    createCrudRouter('/mfi_service_units_infos', db['mfi_service_units_info'], { schema: schemas['mfi_service_units_info'] })
];

const router = express.Router();
routers.forEach(r => { if (r && r.stack) router.use(r); });

module.exports = router;
