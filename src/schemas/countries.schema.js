const { z } = require('zod');

// ===== countries =====

const createSchema = z.object({
    en_short: z.string().max(100),
    en_formal: z.string().max(500).optional().nullable(),
    cn_short: z.string().max(500).optional().nullable(),
    cn_formal: z.string().max(1000).optional().nullable(),
    value: z.string().max(100),
    value_en: z.string().max(255),
    code: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.string()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    en_short: z.string().max(100),
    en_formal: z.string().max(500).optional().nullable(),
    cn_short: z.string().max(500).optional().nullable(),
    cn_formal: z.string().max(1000).optional().nullable(),
    value: z.string().max(100),
    value_en: z.string().max(255),
    code: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.string()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'countries',
};
