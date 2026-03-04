/**
 * views.routes.js — Custom routes for PostgreSQL VIEWs
 * Serves pre-JOINed data for cascading DataGrids
 */
const express = require('express');
const router = express.Router();
const db = require('../models');
const { QueryTypes } = require('sequelize');

// GET /api/v_borrowers_individual — All borrowers with personal info
router.get('/v_borrowers_individual', async (req, res) => {
    try {
        const rows = await db.sequelize.query(
            'SELECT * FROM v_borrowers_individual ORDER BY id',
            { type: QueryTypes.SELECT }
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ v_borrowers_individual error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v_borrower_loans/:person_id — Loans for a specific borrower
router.get('/v_borrower_loans/:person_id', async (req, res) => {
    try {
        const { person_id } = req.params;
        const rows = await db.sequelize.query(
            'SELECT * FROM v_borrower_loans WHERE person_id = :person_id ORDER BY loan_id',
            { replacements: { person_id }, type: QueryTypes.SELECT }
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ v_borrower_loans error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// GET /api/v_loan_collaterals/:loan_id — Collaterals for a specific loan
router.get('/v_loan_collaterals/:loan_id', async (req, res) => {
    try {
        const { loan_id } = req.params;
        const rows = await db.sequelize.query(
            'SELECT * FROM v_loan_collaterals WHERE loan_id = :loan_id ORDER BY id',
            { replacements: { loan_id }, type: QueryTypes.SELECT }
        );
        res.json(rows);
    } catch (err) {
        console.error('❌ v_loan_collaterals error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
