const { z } = require('zod');

// ===== key_personnels =====

const createSchema = z.object({
    value: z.string().max(1000),
    deleted_at: z.string().optional().nullable(),
    grade: z.string().max(50).optional().nullable(),
    base_salary: z.number().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    value: z.string().max(1000),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    grade: z.string().max(50).optional().nullable(),
    base_salary: z.number().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'key_personnels',
};
