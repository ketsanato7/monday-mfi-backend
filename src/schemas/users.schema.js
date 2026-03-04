const { z } = require('zod');

// ===== users =====

const createSchema = z.object({
    username: z.string().max(255),
    password_hash: z.string().max(255),
    employee_id: z.number().int(),
    is_active: z.boolean().optional().nullable(),
    last_login: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    username: z.string().max(255),
    password_hash: z.string().max(255),
    employee_id: z.number().int(),
    is_active: z.boolean().optional().nullable(),
    last_login: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'users',
};
