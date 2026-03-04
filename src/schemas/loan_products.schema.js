const { z } = require('zod');

// ===== loan_products =====

const createSchema = z.object({
    product_name_la: z.string().max(255),
    product_name_en: z.string().max(255).optional().nullable(),
    interest_rate_type: z.string().max(50).optional().nullable(),
    min_interest_rate: z.number().optional().nullable(),
    max_interest_rate: z.number().optional().nullable(),
    currency_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    product_name_la: z.string().max(255),
    product_name_en: z.string().max(255).optional().nullable(),
    interest_rate_type: z.string().max(50).optional().nullable(),
    min_interest_rate: z.number().optional().nullable(),
    max_interest_rate: z.number().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_products',
};
