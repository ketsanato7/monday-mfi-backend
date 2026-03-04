/**
 * auth.routes.js — ເສັ້ນທາງ authentication (production-ready)
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'monday_mfi_secret_key_2025';
const JWT_EXPIRES = '8h';

// Demo users ສຳລັບ dev mode (production ຄວນໃຊ້ DB)
const DEMO_USERS = {
    'superadmin@monday.com': {
        id: 1, name: 'Super Admin', email: 'superadmin@monday.com',
        role: 'superadmin', password_hash: bcrypt.hashSync('@demo1', 10), image: ''
    },
    'admin@kaewjaroen.la': {
        id: 2, name: 'Admin ແກ້ວຈະເລີນ', email: 'admin@kaewjaroen.la',
        role: 'admin', password_hash: bcrypt.hashSync('@demo1', 10), mfi_code: '102', image: ''
    }
};

// POST /api/auth/login — ເຂົ້າລະບົບ
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: false, message: 'ກະລຸນາປ້ອນ Email ແລະ Password' });
    }

    const user = DEMO_USERS[email];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        // Generic message: ບໍ່ບອກວ່າ email ຫຼື password ຜິດ
        return res.status(401).json({ status: false, message: 'ຂໍ້ມູນເຂົ້າລະບົບບໍ່ຖືກຕ້ອງ' });
    }

    // ✅ ໃຊ້ JWT ທີ່ sign ແທ້ (ບໍ່ແມ່ນ Base64)
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, mfi_code: user.mfi_code || null },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );

    return res.json({
        status: true, token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image }
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
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = DEMO_USERS[decoded.email];

        res.json({
            id: decoded.id || 1,
            name: user?.name || 'Admin',
            email: decoded.email,
            role: decoded.role || 'staff',
            image: ''
        });
    } catch {
        return res.status(401).json({ message: 'Token ໝົດອາຍຸ ຫຼື ບໍ່ຖືກຕ້ອງ' });
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
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role === 'superadmin') {
            const { QueryTypes } = require('sequelize');
            const db = require('../models');
            const allPerms = await db.sequelize.query('SELECT name FROM permissions ORDER BY id', { type: QueryTypes.SELECT });
            return res.json({ status: true, permissions: allPerms.map(p => p.name), role: 'superadmin' });
        }

        const { getUserPermissions } = require('../middleware/rbac');
        const perms = await getUserPermissions(decoded.id);
        res.json({ status: true, permissions: perms, role: decoded.role });
    } catch {
        res.status(401).json({ status: false, message: 'Token ໝົດອາຍຸ' });
    }
});

module.exports = router;
