const { createCrudRouter } = require('../utils/crudFactory');
const db = require('../models');
const schemas = require('../schemas');
const express = require('express');

// Auto-generated Dictionary routes — DO NOT EDIT
const routers = [

];

const router = express.Router();
routers.forEach(r => { if (r && r.stack) router.use(r); });

module.exports = router;
