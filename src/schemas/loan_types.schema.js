const { z } = require('zod');

// ===== loan_types =====

const createSchema = z.object({
    value: z.string().max(250).optional().nullable(),
    value_en: z.string().max(250).optional().nullable(),
    code: z.string().max(250).optional().nullable(),
    description: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    status: z.string().max(50).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    value: z.string().max(250).optional().nullable(),
    value_en: z.string().max(250).optional().nullable(),
    code: z.string().max(250).optional().nullable(),
    description: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    status: z.string().max(50).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_types',
};
