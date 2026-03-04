const { z } = require('zod');

// ===== financial_statement_lines =====

const createSchema = z.object({
    statement_id: z.number().int(),
    line_order: z.number().int().optional().nullable(),
    label_lo: z.string().max(255).optional().nullable(),
    label_en: z.string().max(255).optional().nullable(),
    account_code: z.string().max(20).optional().nullable(),
    amount: z.number().optional().nullable(),
    amount_previous: z.number().optional().nullable(),
    is_header: z.boolean().optional().nullable(),
    indent_level: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    statement_id: z.number().int(),
    line_order: z.number().int().optional().nullable(),
    label_lo: z.string().max(255).optional().nullable(),
    label_en: z.string().max(255).optional().nullable(),
    account_code: z.string().max(20).optional().nullable(),
    amount: z.number().optional().nullable(),
    amount_previous: z.number().optional().nullable(),
    is_header: z.boolean().optional().nullable(),
    indent_level: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'financial_statement_lines',
};
