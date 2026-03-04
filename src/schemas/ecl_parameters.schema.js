const { z } = require('zod');

// ===== ecl_parameters =====

const createSchema = z.object({
    loan_category: z.string().max(50),
    stage: z.number().int(),
    pd_rate: z.number(),
    lgd_rate: z.number(),
    stage_threshold_days: z.number().int(),
    effective_date: z.string(),
    org_code: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_category: z.string().max(50),
    stage: z.number().int(),
    pd_rate: z.number(),
    lgd_rate: z.number(),
    stage_threshold_days: z.number().int(),
    effective_date: z.string(),
    org_code: z.string().max(255).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'ecl_parameters',
};
