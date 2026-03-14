/**
 * tenantFilter.js — Multi-Tenancy Middleware
 *
 * ✅ Auto-inject org_id ໃນ SELECT queries (WHERE org_id = ?)
 * ✅ Auto-inject org_id ໃນ INSERT/UPDATE requests
 * ✅ Superadmin ສາມາດເຂົ້າເຖິງທຸກ org
 *
 * Usage:
const logger = require('../config/logger');
 *   const { tenantFilter, injectOrgId } = require('../middleware/tenantFilter');
 *   router.get('/loans', tenantFilter, handler);
 *   router.post('/loans', injectOrgId, handler);
 */

/**
 * ຕາຕະລາງທີ່ບໍ່ຕ້ອງ filter ດ້ວຍ org_id (shared/dictionary)
 */
const SHARED_TABLES = new Set([
    'genders', 'careers', 'marital_statuses', 'nationality', 'educations',
    'currencies', 'categories', 'countries', 'provinces', 'districts', 'villages',
    'loan_categories', 'loan_classifications', 'loan_funding_sources',
    'loan_types', 'loan_terms', 'loan_purpose', 'deposit_types',
    'collateral_categories', 'customer_types', 'enterprise_types',
    'enterprise_categories', 'enterprise_sizes', 'enterprise_models',
    'enterprise_model_details', 'enterprise_stakeholder_roles',
    'economic_branches', 'economic_sectors', 'bank_code', 'bank_type',
    'land_size_units', 'key_personnels', 'interest_configs',
    'roles', 'permissions', 'role_permissions', 'menu_items', 'role_menus',
    'account_categories', 'ecl_parameters',
]);

/**
 * tenantFilter — Middleware ທີ່ set req.tenantOrgId ຈາກ JWT
 *
 * ❌ Superadmin (role=superadmin): org_id = null → ເບິ່ງທຸກ org
 * ✅ ອື່ນໆ: org_id ມາຈາກ JWT payload (employees.org_id)
 */
function tenantFilter(req, res, next) {
    if (!req.user) return next();

    // Superadmin ເຫັນໝົດ
    if (req.user.role === 'superadmin') {
        req.tenantOrgId = null;
        return next();
    }

    // ອ່ານ org_id ຈາກ JWT payload
    const orgId = req.user.org_id || req.headers['x-org-id'];
    if (!orgId) {
        // ❌ SECURITY: ຕ້ອງ block user ທີ່ບໍ່ມີ org_id (ປ້ອງກັນ cross-tenant data leak)
        logger.error(`🚫 SECURITY: User ${req.user.id} (role=${req.user.role}) has no org_id — blocked`);
        return res.status(403).json({
            status: false,
            message: 'ບໍ່ສາມາດເຂົ້າເຖິງ — ບໍ່ມີ org_id. ກະລຸນາຕິດຕໍ່ admin.',
        });
    }

    req.tenantOrgId = typeof orgId === 'number' ? orgId : parseInt(orgId, 10);
    next();
}

/**
 * injectOrgId — Middleware ທີ່ inject org_id ເຂົ້າ req.body ອັດຕະໂນມັດ
 * ໃຊ້ກັບ POST/PUT requests
 */
function injectOrgId(req, res, next) {
    if (!req.user) return next();
    if (req.user.role === 'superadmin') return next();

    const orgId = req.user.org_id || req.user.mfi_code || req.headers['x-org-id'];
    if (orgId && req.body && typeof req.body === 'object') {
        req.body.org_id = parseInt(orgId, 10);
    }
    next();
}

/**
 * ກວດວ່າ table ນີ້ ຕ້ອງ filter org_id ຫຼື ບໍ່
 */
function isSharedTable(tableName) {
    return SHARED_TABLES.has(tableName);
}

/**
 * buildTenantWhere — ສ້າງ WHERE clause ສຳລັບ org_id filtering
 * @param {number|null} orgId - org_id ຈາກ req.tenantOrgId
 * @param {string} tableName - ຊື່ table
 * @returns {object} Sequelize where condition
 */
function buildTenantWhere(orgId, tableName) {
    if (!orgId || isSharedTable(tableName)) {
        return {};
    }
    return { org_id: orgId };
}

module.exports = {
    tenantFilter,
    injectOrgId,
    isSharedTable,
    buildTenantWhere,
    SHARED_TABLES,
};
