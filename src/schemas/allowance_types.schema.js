const { z } = require('zod');

const createSchema = z.object({
    code: z.string().max(50),
    name_la: z.string().max(255),
    name_en: z.string().max(255).optional().nullable(),
    default_amount: z.number().optional().nullable(),
    is_taxable: z.boolean().optional().nullable(),
    applies_to: z.string().max(50).optional().nullable(),
    is_active: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'allowance_types',
};
