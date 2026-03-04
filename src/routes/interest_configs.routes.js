const express = require("express");
const router = express.Router();
const { QueryTypes } = require("sequelize");
const db = require("../models");
const { requirePermission } = require('../middleware/rbac');
const sequelize = db.sequelize;

// ═════════════════════════════════════════
// Interest Configs — CRUD (BI ສິນເຊື່ອ)
// ═════════════════════════════════════════

// GET all or filter by loan_product_id
router.get("/interest_configs", async (req, res) => {
    try {
        const where = [];
        const replacements = {};
        if (req.query.loan_product_id) {
            where.push("loan_product_id = :loan_product_id");
            replacements.loan_product_id = req.query.loan_product_id;
        }
        const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const data = await sequelize.query(
            `SELECT * FROM interest_configs ${whereClause} ORDER BY id ASC`,
            { replacements, type: QueryTypes.SELECT }
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET by id
router.get("/interest_configs/:id", async (req, res) => {
    try {
        const [item] = await sequelize.query(
            "SELECT * FROM interest_configs WHERE id = :id LIMIT 1",
            { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
        );
        if (!item) return res.status(404).json({ error: "Not found" });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create
router.post("/interest_configs", requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    try {
        const { loan_product_id, method_id, annual_rate, compounding_frequency,
            day_count_convention, grace_period_days, penalty_rate, min_rate,
            max_rate, org_code } = req.body;
        const [result] = await sequelize.query(
            `INSERT INTO interest_configs 
             (loan_product_id, method_id, annual_rate, compounding_frequency, 
              day_count_convention, grace_period_days, penalty_rate, min_rate, max_rate, org_code)
             VALUES (:loan_product_id, :method_id, :annual_rate, :compounding_frequency,
              :day_count_convention, :grace_period_days, :penalty_rate, :min_rate, :max_rate, :org_code)
             RETURNING *`,
            {
                replacements: {
                    loan_product_id, method_id, annual_rate: annual_rate || 0,
                    compounding_frequency: compounding_frequency || "monthly",
                    day_count_convention: day_count_convention || "30/360",
                    grace_period_days: grace_period_days || 0,
                    penalty_rate: penalty_rate || 0, min_rate: min_rate || 0,
                    max_rate: max_rate || 0, org_code: org_code || null,
                },
            }
        );
        res.status(201).json(result[0] || result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update
router.put("/interest_configs/:id", requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    try {
        const fields = [];
        const replacements = { id: req.params.id };
        const allowed = [
            "loan_product_id", "method_id", "annual_rate", "compounding_frequency",
            "day_count_convention", "grace_period_days", "penalty_rate", "min_rate",
            "max_rate", "org_code",
        ];
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                fields.push(`${key} = :${key}`);
                replacements[key] = req.body[key];
            }
        }
        if (fields.length === 0) return res.json({ message: "No fields to update" });
        fields.push("updated_at = NOW()");
        const [result] = await sequelize.query(
            `UPDATE interest_configs SET ${fields.join(", ")} WHERE id = :id RETURNING *`,
            { replacements }
        );
        res.json(result[0] || result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete("/interest_configs/:id", requirePermission('ແກ້ໄຂສິນເຊື່ອ'), async (req, res) => {
    try {
        await sequelize.query("DELETE FROM interest_configs WHERE id = :id", {
            replacements: { id: req.params.id },
        });
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
