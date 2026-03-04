const { z } = require('zod');

// ===== journal_entry_lines =====

const createSchema = z.object({
    journal_entry_id: z.number().int(),
    account_id: z.number().int(),
    description: z.string().max(255).optional().nullable(),
    debit: z.number(),
    credit: z.number(),
    debit_amount_lak: z.number().optional().nullable(),
    credit_amount_lak: z.number().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    journal_entry_id: z.number().int(),
    account_id: z.number().int(),
    description: z.string().max(255).optional().nullable(),
    debit: z.number(),
    credit: z.number(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    debit_amount_lak: z.number().optional().nullable(),
    credit_amount_lak: z.number().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'journal_entry_lines',
};
