const { z } = require('zod');

// ===== permissions =====

const createSchema = z.object({
    code: z.string().max(100),
    name: z.string().max(255),
    module: z.string().max(100).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    code: z.string().max(100),
    name: z.string().max(255),
    module: z.string().max(100).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'permissions',
};
