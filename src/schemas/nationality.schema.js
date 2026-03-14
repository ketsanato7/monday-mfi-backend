const { z } = require('zod');

// ===== nationality =====

const createSchema = z.object({
    value: z.string().max(255).optional().nullable(),
    value_en: z.string().max(255).optional().nullable(),
    code: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    nationality_id: z.number().int().optional().nullable(),
    value: z.string().max(255).optional().nullable(),
    value_en: z.string().max(255).optional().nullable(),
    code: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'nationality',
};
