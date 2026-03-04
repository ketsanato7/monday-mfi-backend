const { z } = require('zod');

// ===== account_categories =====

const createSchema = z.object({
    code: z.string().max(10),
    name_lo: z.string().max(255),
    name_en: z.string().max(255),
    normal_balance: z.string().max(10),
    sort_order: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    code: z.string().max(10),
    name_lo: z.string().max(255),
    name_en: z.string().max(255),
    normal_balance: z.string().max(10),
    sort_order: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'account_categories',
};
