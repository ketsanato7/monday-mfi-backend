const { z } = require('zod');

// ===== villages =====

const createSchema = z.object({
    value: z.string().max(500),
    value_en: z.string().max(255).optional().nullable(),
    district_id: z.number().int(),
    code: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    value: z.string().max(500),
    value_en: z.string().max(255).optional().nullable(),
    district_id: z.number().int(),
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
    tableName: 'villages',
};
