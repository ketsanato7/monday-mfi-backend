/**
 * translations.routes.js — REST API for i18n translations from DB
 *
 * ✅ GET  /api/translations         → ດຶງທັງໝົດ (cached)
 * ✅ GET  /api/translations/:module  → ດຶງຕາມ module
 * ✅ POST /api/translations          → ສ້າງໃໝ່ (admin only)
 * ✅ PUT  /api/translations/:id      → ແກ້ໄຂ (admin only)
 * ✅ DELETE /api/translations/:id    → ລຶບ (admin only)
 */
const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // ── Cache ──
  let cache = null;
  let cacheTime = 0;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  function clearCache() {
    cache = null;
    cacheTime = 0;
  }

  // ── GET /translations — ດຶງທັງໝົດ ──
  router.get('/translations', async (req, res) => {
    try {
      // Use cache
      if (cache && Date.now() - cacheTime < CACHE_TTL) {
        return res.json(cache);
      }

      const [rows] = await db.sequelize.query(
        'SELECT key, value_LA, value_EN, value_TH, module FROM translations ORDER BY module, key'
      );
      cache = rows;
      cacheTime = Date.now();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // ── GET /translations/:module — ດຶງຕາມ module ──
  router.get('/translations/:module', async (req, res) => {
    try {
      const [rows] = await db.sequelize.query(
        'SELECT key, value_LA, value_EN, value_TH, module FROM translations WHERE module = $1 ORDER BY key',
        { bind: [req.params.module] }
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // ── POST /translations — ສ້າງໃໝ່ ──
  router.post('/translations', async (req, res) => {
    try {
      const { key, value_LA, value_EN, value_TH, module, description } = req.body;
      if (!key) return res.status(400).json({ status: false, message: 'key is required' });

      const [rows] = await db.sequelize.query(
        `INSERT INTO translations (key, value_LA, value_EN, value_TH, module, description, org_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        {
          bind: [
            key,
            value_LA || '',
            value_EN || '',
            value_TH || '',
            module || null,
            description || null,
            req.orgId || null,
          ],
        }
      );
      clearCache();
      res.json({ status: true, data: rows[0] });
    } catch (err) {
      if (err.message?.includes('duplicate key')) {
        return res.status(409).json({ status: false, message: `Key "${req.body.key}" already exists` });
      }
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // ── PUT /translations/:id — ແກ້ໄຂ ──
  router.put('/translations/:id', async (req, res) => {
    try {
      const { value_LA, value_EN, value_TH, module, description } = req.body;
      const [rows] = await db.sequelize.query(
        `UPDATE translations SET value_LA = $1, value_EN = $2, value_TH = $3, module = $4, description = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        {
          bind: [
            value_LA || '',
            value_EN || '',
            value_TH || '',
            module || null,
            description || null,
            req.params.id,
          ],
        }
      );
      clearCache();
      if (rows.length === 0) return res.status(404).json({ status: false, message: 'Not found' });
      res.json({ status: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  // ── DELETE /translations/:id — ລຶບ ──
  router.delete('/translations/:id', async (req, res) => {
    try {
      const [, meta] = await db.sequelize.query(
        'DELETE FROM translations WHERE id = $1',
        { bind: [req.params.id] }
      );
      clearCache();
      res.json({ status: true, deleted: meta?.rowCount || 1 });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  });

  return router;
};
