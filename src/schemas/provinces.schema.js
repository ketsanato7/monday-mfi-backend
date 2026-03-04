const { z } = require('zod');

// ===== provinces =====

const createSchema = z.object({
    value: z.string().max(100),
    code: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    value_en: z.string().max(255).optional().nullable(),
    status: z.string(),
    country_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    value: z.string().max(100),
    code: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    value_en: z.string().max(255).optional().nullable(),
    status: z.string(),
    country_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'provinces',
};
