const { z } = require('zod');

// ===== iif_loan_details =====

const createSchema = z.object({
    loan_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    product_id: z.string().max(50).optional().nullable(),
    loan_account_no: z.string().max(100).optional().nullable(),
    purpose_code: z.string().max(10).optional().nullable(),
    loan_status_code: z.string().max(10).optional().nullable(),
    outstanding_interest: z.number().optional().nullable(),
    past_due_date: z.string().optional().nullable(),
    past_due_principal: z.number().optional().nullable(),
    past_due_interest: z.number().optional().nullable(),
    loan_status_literal: z.string().max(20).optional().nullable(),
    lcic_loan_id: z.string().max(50).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    product_id: z.string().max(50).optional().nullable(),
    loan_account_no: z.string().max(100).optional().nullable(),
    purpose_code: z.string().max(10).optional().nullable(),
    loan_status_code: z.string().max(10).optional().nullable(),
    outstanding_interest: z.number().optional().nullable(),
    past_due_date: z.string().optional().nullable(),
    past_due_principal: z.number().optional().nullable(),
    past_due_interest: z.number().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    loan_status_literal: z.string().max(20).optional().nullable(),
    lcic_loan_id: z.string().max(50).optional().nullable(),
    created_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'iif_loan_details',
};
