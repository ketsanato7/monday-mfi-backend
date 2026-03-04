const { z } = require('zod');

// ===== enterprise_categories =====

const createSchema = z.object({
    value: z.string().max(100),
    value_en: z.string().max(255),
    code: z.string().max(10).optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.string().max(50).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    value: z.string().max(100),
    value_en: z.string().max(255),
    code: z.string().max(10).optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.string().max(50).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'enterprise_categories',
};
