const { z } = require('zod');

// ===== enterprise_types =====

const createSchema = z.object({
    value: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    value: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'enterprise_types',
};
