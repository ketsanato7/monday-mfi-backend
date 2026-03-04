const { createCrudRouter } = require('../utils/crudFactory');
const db = require('../models');
const schemas = require('../schemas');
const express = require('express');

// Auto-generated Accounting routes — DO NOT EDIT
const routers = [
    createCrudRouter('/chart_of_accounts', db['chart_of_accounts'], { schema: schemas['chart_of_accounts'] }),
    createCrudRouter('/journal_entries', db['journal_entries'], { schema: schemas['journal_entries'] }),
    createCrudRouter('/journal_entry_lines', db['journal_entry_lines'], { schema: schemas['journal_entry_lines'] }),
    createCrudRouter('/trial_balance', db['trial_balance'], { schema: schemas['trial_balance'] })
];

const router = express.Router();
routers.forEach(r => { if (r && r.stack) router.use(r); });

module.exports = router;
