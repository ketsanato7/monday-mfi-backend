const { z } = require('zod');

// ===== loan_applications =====

const createSchema = z.object({
    application_no: z.string().max(255),
    personal_info_id: z.number().int().optional().nullable(),
    enterprise_info_id: z.number().int().optional().nullable(),
    loan_product_id: z.number().int(),
    requested_amount: z.number(),
    requested_term: z.number().int(),
    purpose: z.string(),
    monthly_income: z.number().optional().nullable(),
    monthly_expense: z.number().optional().nullable(),
    dti_ratio: z.number().optional().nullable(),
    recommended_amount: z.number().optional().nullable(),
    recommended_term: z.number().int().optional().nullable(),
    status: z.string().max(255).optional().nullable(),
    kyc_status: z.string().max(255).optional().nullable(),
    kyc_notes: z.string().optional().nullable(),
    assigned_officer_id: z.number().int().optional().nullable(),
    branch_id: z.string().max(255).optional().nullable(),
    disbursement_method: z.string().max(255).optional().nullable(),
    disbursement_date: z.string().optional().nullable(),
    contract_no: z.string().max(255).optional().nullable(),
    loan_id: z.number().int().optional().nullable(),
    notes: z.string().optional().nullable(),
    bank_name: z.string().max(255).optional().nullable(),
    bank_account_no: z.string().max(255).optional().nullable(),
    bank_account_owner: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    application_no: z.string().max(255),
    personal_info_id: z.number().int().optional().nullable(),
    enterprise_info_id: z.number().int().optional().nullable(),
    loan_product_id: z.number().int(),
    requested_amount: z.number(),
    requested_term: z.number().int(),
    purpose: z.string(),
    monthly_income: z.number().optional().nullable(),
    monthly_expense: z.number().optional().nullable(),
    dti_ratio: z.number().optional().nullable(),
    recommended_amount: z.number().optional().nullable(),
    recommended_term: z.number().int().optional().nullable(),
    status: z.string().max(255).optional().nullable(),
    kyc_status: z.string().max(255).optional().nullable(),
    kyc_notes: z.string().optional().nullable(),
    assigned_officer_id: z.number().int().optional().nullable(),
    branch_id: z.string().max(255).optional().nullable(),
    disbursement_method: z.string().max(255).optional().nullable(),
    disbursement_date: z.string().optional().nullable(),
    contract_no: z.string().max(255).optional().nullable(),
    loan_id: z.number().int().optional().nullable(),
    notes: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
    bank_name: z.string().max(255).optional().nullable(),
    bank_account_no: z.string().max(255).optional().nullable(),
    bank_account_owner: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_applications',
};
