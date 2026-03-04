const { z } = require('zod');

// ===== journal_entries =====

const createSchema = z.object({
    transaction_date: z.string(),
    reference_no: z.string().max(50),
    description: z.string().optional().nullable(),
    currency_code: z.string().max(10),
    exchange_rate: z.number(),
    status: z.string().max(20),
    total_debit: z.number(),
    total_credit: z.number(),
    branch_id: z.string().max(100).optional().nullable(),
    created_by: z.number().int().optional().nullable(),
    posted_by: z.number().int().optional().nullable(),
    posted_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    fiscal_period_id: z.number().int().optional().nullable(),
    source_module: z.string().max(50).optional().nullable(),
    source_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    transaction_date: z.string(),
    reference_no: z.string().max(50),
    description: z.string().optional().nullable(),
    currency_code: z.string().max(10),
    exchange_rate: z.number(),
    status: z.string().max(20),
    total_debit: z.number(),
    total_credit: z.number(),
    branch_id: z.string().max(100).optional().nullable(),
    created_by: z.number().int().optional().nullable(),
    posted_by: z.number().int().optional().nullable(),
    posted_at: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    fiscal_period_id: z.number().int().optional().nullable(),
    source_module: z.string().max(50).optional().nullable(),
    source_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'journal_entries',
};
