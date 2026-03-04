const { z } = require('zod');

// ===== loan_purpose =====

const createSchema = z.object({
    value: z.string().optional().nullable(),
    value_en: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    value: z.string().optional().nullable(),
    value_en: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_purpose',
};
