/**
 * MFA Routes — Multi-Factor Authentication
 * BoL + GEMINI: MFA ບັງຄັບ ສຳລັບ admin roles
 */
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const mfaService = require('../services/mfa.service');
const db = require('../models');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Helper: Extract user from token (cookie or header)
 */
function getUserFromToken(req) {
    let token = req.cookies?.token;
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

// GET /api/mfa/status — Check MFA status for current user
router.get('/mfa/status', async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const status = await mfaService.getStatus(user.id, db);
        status.isRequired = mfaService.requiresMfa(user.role);

        res.json({ success: true, data: status });
    } catch (err) {
        logger.error('MFA status failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to check MFA status' });
    }
});

// POST /api/mfa/setup — Generate QR code for TOTP setup
router.post('/mfa/setup', async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const result = await mfaService.setup(user.id, user.username || user.name, db);

        res.json({
            success: true,
            data: {
                qrCode: result.qrCode,         // Data URL for QR image
                secret: result.secret,           // Manual entry code
                backupCodes: result.backupCodes, // Emergency backup codes
            },
            message: 'Scan QR code with Google Authenticator then verify with a 6-digit code',
        });
    } catch (err) {
        logger.error('MFA setup failed', { error: err.message });
        res.status(400).json({ success: false, message: err.message });
    }
});

// POST /api/mfa/verify — Verify TOTP code and enable MFA
router.post('/mfa/verify', async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const { code } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Code required' });

        await mfaService.verifyAndEnable(user.id, code, db);

        res.json({ success: true, message: 'MFA enabled successfully' });
    } catch (err) {
        logger.error('MFA verify failed', { error: err.message });
        res.status(400).json({ success: false, message: err.message });
    }
});

// POST /api/mfa/validate — Validate MFA code during login
router.post('/mfa/validate', async (req, res) => {
    try {
        const { userId, code, tempToken } = req.body;

        if (!userId || !code || !tempToken) {
            return res.status(400).json({ success: false, message: 'userId, code, and tempToken required' });
        }

        // Verify temp token
        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: 'Temp token expired' });
        }

        if (decoded.id !== userId || !decoded.mfa_pending) {
            return res.status(400).json({ success: false, message: 'Invalid temp token' });
        }

        // Verify MFA code
        const isValid = await mfaService.verifyCode(userId, code, db);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid MFA code' });
        }

        // Issue full JWT (same payload as login, without mfa_pending)
        const fullToken = jwt.sign(
            {
                id: decoded.id,
                username: decoded.username,
                name: decoded.name,
                role: decoded.role,
                employee_id: decoded.employee_id,
                org_id: decoded.org_id,
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Set httpOnly cookie
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('token', fullToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'strict' : 'lax',
            maxAge: 8 * 60 * 60 * 1000,
            path: '/',
        });

        res.json({
            success: true,
            token: fullToken,
            user: {
                id: decoded.id,
                name: decoded.name,
                email: decoded.username,
                role: decoded.role,
            },
            message: 'MFA verification successful',
        });
    } catch (err) {
        logger.error('MFA validate failed', { error: err.message });
        res.status(500).json({ success: false, message: 'MFA validation failed' });
    }
});

// POST /api/mfa/disable — Disable MFA (requires auth)
router.post('/mfa/disable', async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });

        // Only self or superadmin can disable
        const targetUserId = req.body.userId || user.id;
        if (targetUserId !== user.id && user.role !== 'superadmin' && user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'Only admin can disable other users MFA' });
        }

        await mfaService.disable(targetUserId, db);
        res.json({ success: true, message: 'MFA disabled' });
    } catch (err) {
        logger.error('MFA disable failed', { error: err.message });
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
