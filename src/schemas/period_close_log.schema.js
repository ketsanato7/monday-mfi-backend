const { z } = require('zod');

// ===== period_close_log =====

const createSchema = z.object({
    fiscal_period_id: z.number().int(),
    closed_by: z.number().int().optional().nullable(),
    closed_at: z.string().optional().nullable(),
    action: z.string().max(20),
    notes: z.string().optional().nullable(),
    org_code: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    fiscal_period_id: z.number().int(),
    closed_by: z.number().int().optional().nullable(),
    closed_at: z.string().optional().nullable(),
    action: z.string().max(20),
    notes: z.string().optional().nullable(),
    org_code: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'period_close_log',
};
