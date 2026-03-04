const { z } = require('zod');

// ===== fiscal_periods =====

const createSchema = z.object({
    period_name: z.string().max(50),
    period_type: z.string().max(20),
    start_date: z.string(),
    end_date: z.string(),
    status: z.string().max(20),
    org_code: z.string().max(255).optional().nullable(),
    closed_by: z.number().int().optional().nullable(),
    closed_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    period_name: z.string().max(50),
    period_type: z.string().max(20),
    start_date: z.string(),
    end_date: z.string(),
    status: z.string().max(20),
    org_code: z.string().max(255).optional().nullable(),
    closed_by: z.number().int().optional().nullable(),
    closed_at: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'fiscal_periods',
};
