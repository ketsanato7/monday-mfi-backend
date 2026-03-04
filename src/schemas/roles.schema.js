const { z } = require('zod');

// ===== roles =====

const createSchema = z.object({
    code: z.string().max(50),
    name: z.string().max(255),
    description: z.string().optional().nullable(),
    is_system: z.boolean().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    code: z.string().max(50),
    name: z.string().max(255),
    description: z.string().optional().nullable(),
    is_system: z.boolean().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'roles',
};
