/**
 * rbac.js — Role-Based Access Control Middleware
 * 
 * Usage:
 *   const { requireAuth, requirePermission } = require('../middleware/rbac');
 *   router.post('/pay', requireAuth, requirePermission('ແກ້ໄຂສິນເຊື່ອ'), handler);
 */
const db = require('../models');
const seq = db.sequelize;

// Cache permissions in memory (refresh every 5 min)
let permCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadPermissions() {
    if (permCache && (Date.now() - cacheTime < CACHE_TTL)) return permCache;

    const rows = await seq.query(`
        SELECT r.id AS role_id, r.name AS role_name, p.id AS perm_id, p.name AS perm_name
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
    `, { type: seq.QueryTypes.SELECT });

    // Build map: role_id → Set of permission names
    const map = {};
    for (const row of rows) {
        if (!map[row.role_id]) map[row.role_id] = new Set();
        map[row.role_id].add(row.perm_name);
    }
    permCache = map;
    cacheTime = Date.now();
    return map;
}

/**
 * requireAuth — Decode token and attach user to req
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: false, message: '❌ ບໍ່ມີ token — ກະລຸນາ login' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ status: false, message: '❌ Token ບໍ່ຖືກຕ້ອງ' });
    }
}

/**
 * requirePermission — Check if user's role has the required permission
 * @param {string} permissionName - Name of the permission to check
 */
function requirePermission(permissionName) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ status: false, message: '❌ ບໍ່ມີ user — ກະລຸນາ login' });
            }

            // Superadmin bypass
            if (req.user.role === 'superadmin') return next();

            // Get user's role_id from DB
            const userRoles = await seq.query(
                `SELECT role_id FROM user_roles WHERE user_id = $1`,
                { bind: [req.user.id], type: seq.QueryTypes.SELECT }
            );

            if (userRoles.length === 0) {
                return res.status(403).json({ status: false, message: '❌ ບໍ່ມີບົດບາດ — ຕິດຕໍ່ admin' });
            }

            const permMap = await loadPermissions();

            // Check if any of user's roles has the required permission
            for (const ur of userRoles) {
                const perms = permMap[ur.role_id];
                if (perms && perms.has(permissionName)) {
                    return next();
                }
            }

            return res.status(403).json({
                status: false,
                message: `⛔ ບໍ່ມີສິດ "${permissionName}" — ຕິດຕໍ່ ຜູ້ຈັດການ`
            });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    };
}

/**
 * getUserPermissions — Get all permissions for a user
 */
async function getUserPermissions(userId) {
    const rows = await seq.query(`
        SELECT DISTINCT p.name
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = $1
    `, { bind: [userId], type: seq.QueryTypes.SELECT });
    return rows.map(r => r.name);
}

module.exports = { requireAuth, requirePermission, getUserPermissions, loadPermissions };
