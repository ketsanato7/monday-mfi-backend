const { z } = require('zod');

// ===== collateral_enterprises =====

const createSchema = z.object({
    enterprise_id: z.number().int(),
    collateral_id: z.number().int(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    enterprise_id: z.number().int(),
    collateral_id: z.number().int(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'collateral_enterprises',
};
