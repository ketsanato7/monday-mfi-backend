const { z } = require('zod');

// ===== customer_blacklists =====

const createSchema = z.object({
    customer_id: z.number().int(),
    customer_type: z.string().max(255),
    reason: z.string(),
    blacklisted_by: z.number().int(),
    blacklisted_date: z.string(),
    removed_date: z.string().optional().nullable(),
    removed_by: z.number().int().optional().nullable(),
    is_active: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    customer_id: z.number().int(),
    customer_type: z.string().max(255),
    reason: z.string(),
    blacklisted_by: z.number().int(),
    blacklisted_date: z.string(),
    removed_date: z.string().optional().nullable(),
    removed_by: z.number().int().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'customer_blacklists',
};
