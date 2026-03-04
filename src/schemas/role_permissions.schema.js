const { z } = require('zod');

// ===== role_permissions =====

const createSchema = z.object({
    role_id: z.number().int(),
    permission_id: z.number().int(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    role_id: z.number().int(),
    permission_id: z.number().int(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'role_permissions',
};
