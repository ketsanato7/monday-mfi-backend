const { z } = require('zod');

// ===== exchange_rates =====

const createSchema = z.object({
    currency_code: z.string().max(10),
    rate_date: z.string(),
    buying_rate: z.number().optional().nullable(),
    selling_rate: z.number().optional().nullable(),
    mid_rate: z.number().optional().nullable(),
    source: z.string().max(50).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    currency_code: z.string().max(10),
    rate_date: z.string(),
    buying_rate: z.number().optional().nullable(),
    selling_rate: z.number().optional().nullable(),
    mid_rate: z.number().optional().nullable(),
    source: z.string().max(50).optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'exchange_rates',
};
