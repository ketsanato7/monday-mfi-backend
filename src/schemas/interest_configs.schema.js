const { z } = require('zod');

// ===== interest_configs =====

const createSchema = z.object({
    loan_product_id: z.number().int().optional().nullable(),
    method_id: z.number().int().optional().nullable(),
    annual_rate: z.number().optional().nullable(),
    compounding_frequency: z.string().max(20).optional().nullable(),
    day_count_convention: z.string().max(20).optional().nullable(),
    grace_period_days: z.number().int().optional().nullable(),
    penalty_rate: z.number().optional().nullable(),
    min_rate: z.number().optional().nullable(),
    max_rate: z.number().optional().nullable(),
    org_code: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_product_id: z.number().int().optional().nullable(),
    method_id: z.number().int().optional().nullable(),
    annual_rate: z.number().optional().nullable(),
    compounding_frequency: z.string().max(20).optional().nullable(),
    day_count_convention: z.string().max(20).optional().nullable(),
    grace_period_days: z.number().int().optional().nullable(),
    penalty_rate: z.number().optional().nullable(),
    min_rate: z.number().optional().nullable(),
    max_rate: z.number().optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'interest_configs',
};
