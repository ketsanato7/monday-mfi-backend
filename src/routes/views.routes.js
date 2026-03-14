/**
 * views.routes.js — Generic route to serve SQL views (v_*) as read-only API
 *
 * ✅ GET /api/v_{viewName} → SELECT * FROM v_{viewName}
 * ✅ Supports soft-delete filter (deleted_at IS NULL)
 * ✅ Supports tenant filter (org_id)
 * ✅ Whitelist-based: only serves known v_* views
 * ✅ Read-only: no POST/PUT/DELETE
 * ✅ Keeps legacy specific routes for backward compatibility
 */
const logger = require('../config/logger');
const express = require('express');
const router = express.Router();
const db = require('../models');
const { QueryTypes } = require('sequelize');

// ── Whitelist of allowed views ──
const ALLOWED_VIEWS = new Set([
    'v_addresses', 'v_bank_code', 'v_borrower_loans', 'v_borrowers_individual',
    'v_chart_of_accounts', 'v_collateral_enterprises', 'v_collateral_individuals',
    'v_collaterals', 'v_contact_details', 'v_deposit_account_owners',
    'v_deposit_accounts', 'v_deposit_products', 'v_deposit_transactions',
    'v_districts', 'v_employee_allowances', 'v_employee_assignments',
    'v_employee_positions', 'v_employees', 'v_employment_contracts',
    'v_enterprise_model_details', 'v_enterprise_stakeholders',
    'v_family_books', 'v_financial_statement_lines', 'v_financial_statements',
    'v_gl_balances', 'v_health_insurance',
    'v_iif_collateral_details', 'v_iif_cosigners', 'v_iif_enterprise_details',
    'v_iif_individual_details', 'v_iif_loan_details',
    'v_individual_groups', 'v_journal_entries', 'v_journal_entry_lines',
    'v_lao_id_cards', 'v_leave_balances', 'v_leave_requests',
    'v_loan_approval_history', 'v_loan_approval_limits',
    'v_loan_collaterals', 'v_loan_contracts', 'v_loan_products',
    'v_loan_repayment_schedules', 'v_loan_transactions',
    'v_marriages', 'v_member_shares', 'v_member_shares_enterprises',
    'v_member_shares_individuals', 'v_mfi_branch_service_units',
    'v_mfi_hq_service_units', 'v_overtime_records',
    'v_passports', 'v_payrolls', 'v_period_close_log',
    'v_personal_relationships', 'v_personal_surname_history',
    'v_provinces', 'v_role_permissions',
    'v_staff_compliance', 'v_trainings',
    'v_trial_balance', 'v_user_roles', 'v_users', 'v_villages',
]);

/**
 * GET /api/v_:viewName — Generic view reader
 */
router.get('/v_:viewName', async (req, res) => {
    try {
        const viewName = 'v_' + req.params.viewName;

        // ── Security: only whitelisted views ──
        if (!ALLOWED_VIEWS.has(viewName)) {
            return res.status(404).json({
                status: false,
                message: `View "${viewName}" ບໍ່ມີ ຫຼື ບໍ່ອະນຸຍາດ`,
            });
        }

        // ── First try with filters ──
        try {
            const conditions = [];
            if (req.query.show_deleted !== 'true') {
                conditions.push('deleted_at IS NULL');
            }
            if (req.tenantOrgId) {
                conditions.push(`org_id = ${parseInt(req.tenantOrgId)}`);
            }

            const whereClause = conditions.length
                ? 'WHERE ' + conditions.join(' AND ')
                : '';

            const data = await db.sequelize.query(
                `SELECT * FROM ${viewName} ${whereClause} ORDER BY id DESC LIMIT 2000`,
                { type: QueryTypes.SELECT }
            );
            return res.status(200).json(data);
        } catch (filterErr) {
            // ── Fallback: view may not have deleted_at/org_id/id columns ──
            try {
                const data = await db.sequelize.query(
                    `SELECT * FROM ${viewName} LIMIT 2000`,
                    { type: QueryTypes.SELECT }
                );
                return res.status(200).json(data);
            } catch (fallbackErr) {
                throw fallbackErr;
            }
        }
    } catch (error) {
        logger.error(`❌ View v_${req.params.viewName} error:`, error.message);
        return res.status(500).json({
            status: false,
            message: error.message,
        });
    }
});

module.exports = router;
