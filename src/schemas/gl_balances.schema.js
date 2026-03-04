const { z } = require('zod');

// ===== gl_balances =====

const createSchema = z.object({
    account_code: z.string().max(20),
    fiscal_period_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    opening_debit: z.number().optional().nullable(),
    opening_credit: z.number().optional().nullable(),
    period_debit: z.number().optional().nullable(),
    period_credit: z.number().optional().nullable(),
    closing_debit: z.number().optional().nullable(),
    closing_credit: z.number().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    account_code: z.string().max(20),
    fiscal_period_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    opening_debit: z.number().optional().nullable(),
    opening_credit: z.number().optional().nullable(),
    period_debit: z.number().optional().nullable(),
    period_credit: z.number().optional().nullable(),
    closing_debit: z.number().optional().nullable(),
    closing_credit: z.number().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'gl_balances',
};
