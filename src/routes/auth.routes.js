/**
 * auth.routes.js — ເສັ້ນທາງ authentication (dev mode)
 */
const express = require('express');
const router = express.Router();

// Demo users ສຳລັບທົດສອບ
const DEMO_USERS = {
    'superadmin@monday.com': {
        id: 1, name: 'Super Admin', email: 'superadmin@monday.com',
        role: 'superadmin', password: '@demo1', image: ''
    },
    'admin@kaewjaroen.la': {
        id: 2, name: 'Admin ແກ້ວຈະເລີນ', email: 'admin@kaewjaroen.la',
        role: 'admin', password: '@demo1', mfi_code: '102', image: ''
    },
    'toolpad-demo@mui.com': {
        id: 1, name: 'Super Admin', email: 'toolpad-demo@mui.com',
        role: 'superadmin', password: '@demo1', image: ''
    }
};

// POST /api/auth/login — ເຂົ້າລະບົບ
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const user = DEMO_USERS[email];
    if (user && user.password === password) {
        const token = Buffer.from(JSON.stringify({
            id: user.id, email: user.email,
            role: user.role, mfi_code: user.mfi_code || null,
            iat: Date.now()
        })).toString('base64');

        return res.json({
            status: true, token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image }
        });
    }

    // ❌ Email ຫຼື Password ບໍ່ຖືກ
    return res.status(401).json({
        status: false,
        message: 'Email ຫຼື ລະຫັດຜ່ານ ບໍ່ຖືກຕ້ອງ'
    });
});

// GET /api/auth/me — ກວດສອບ token ແລະ ສົ່ງຂໍ້ມູນ user
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        const user = DEMO_USERS[decoded.email];

        res.json({
            id: decoded.id || 1,
            name: user?.name || 'Super Admin',
            email: decoded.email || 'admin@monday.com',
            role: decoded.role || 'superadmin',
            image: ''
        });
    } catch (err) {
        return res.status(401).json({ message: 'Token ບໍ່ຖືກຕ້ອງ' });
    }
});

// GET /api/auth/permissions — ສົ່ງ ສິດ ທັງໝົດ ຂອງ user
router.get('/permissions', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: false, message: 'No token' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

        if (decoded.role === 'superadmin') {
            const { QueryTypes } = require('sequelize');
            const db = require('../models');
            const allPerms = await db.sequelize.query('SELECT name FROM permissions ORDER BY id', { type: QueryTypes.SELECT });
            return res.json({ status: true, permissions: allPerms.map(p => p.name), role: 'superadmin' });
        }

        const { getUserPermissions } = require('../middleware/rbac');
        const perms = await getUserPermissions(decoded.id);
        res.json({ status: true, permissions: perms, role: decoded.role });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

module.exports = router;

