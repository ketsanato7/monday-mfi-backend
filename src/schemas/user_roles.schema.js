const { z } = require('zod');

// ===== user_roles =====

const createSchema = z.object({
    user_id: z.number().int(),
    role_id: z.number().int(),
    assigned_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    user_id: z.number().int(),
    role_id: z.number().int(),
    assigned_at: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'user_roles',
};
