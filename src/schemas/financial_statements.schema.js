const { z } = require('zod');

// ===== financial_statements =====

const createSchema = z.object({
    statement_type: z.string().max(50),
    fiscal_period_id: z.number().int(),
    generated_at: z.string().optional().nullable(),
    generated_by: z.number().int().optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    status: z.string().max(20).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    statement_type: z.string().max(50),
    fiscal_period_id: z.number().int(),
    generated_at: z.string().optional().nullable(),
    generated_by: z.number().int().optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    status: z.string().max(20).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'financial_statements',
};
