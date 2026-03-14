/**
 * bol_report.routes.js — Thin Controller (6 endpoints)
 * ❌ ກ່ອນ: 309 ແຖວ → ✅ ຫຼັງ: ~25 ແຖວ
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const S = require('../services/bolReport.service');

router.get('/bol/a1', asyncHandler(async (_req, res) => { const r = await S.getA1(); res.json({ success: true, data: r.data, total: r.data.length }); }));
router.get('/bol/a2', asyncHandler(async (_req, res) => { const r = await S.getA2(); res.json({ success: true, data: r.data, total: r.data.length }); }));
router.get('/bol/b1', asyncHandler(async (_req, res) => { const r = await S.getB1(); res.json({ success: true, data: r.data, total: r.data.length }); }));
router.get('/bol/c1', asyncHandler(async (_req, res) => { const r = await S.getC1(); res.json({ success: true, data: r.data, total: r.data.length }); }));
router.get('/bol/xml', asyncHandler(async (req, res) => {
    const { xml, filename } = await S.generateXml(req.query.period);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
}));
router.get('/bol/report', asyncHandler(async (req, res) => { res.json(await S.report(req.query.period)); }));

module.exports = router;
