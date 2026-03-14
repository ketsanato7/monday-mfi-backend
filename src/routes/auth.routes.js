/**
 * auth.routes.js — Thin controller (was 294 lines → ~30)
 */
const router = require('express').Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const AuthService = require('../services/auth.service');

/** Helper: get "Bearer <token>" from cookie or header */
function getAuthHeader(req) {
    if (req.headers.authorization) return req.headers.authorization;
    const cookieToken = req.cookies?.token;
    if (cookieToken) return `Bearer ${cookieToken}`;
    return null;
}

router.post('/login', asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body.email || req.body.username, req.body.password);
    if (result.token) {
        res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 8 * 60 * 60 * 1000 });
    }
    res.json(result);
}));

router.post('/logout', asyncHandler(async (_req, res) => {
    res.clearCookie('token'); res.json({ message: 'ອອກຈາກລະບົບສຳເລັດ' });
}));

router.get('/me', asyncHandler(async (req, res) => {
    res.json(await AuthService.me(getAuthHeader(req)));
}));

router.get('/permissions', asyncHandler(async (req, res) => {
    res.json(await AuthService.permissions(getAuthHeader(req)));
}));

router.post('/change-password', asyncHandler(async (req, res) => {
    res.json(await AuthService.changePassword(getAuthHeader(req), req.body.currentPassword, req.body.newPassword));
}));

module.exports = router;
