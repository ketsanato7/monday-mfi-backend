const { z } = require('zod');

const createSchema = z.object({
    min_income: z.number(),
    max_income: z.number().optional().nullable(),
    rate: z.number(),
    effective_date: z.string(),
    description: z.string().max(255).optional().nullable(),
    is_active: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'tax_brackets',
};
