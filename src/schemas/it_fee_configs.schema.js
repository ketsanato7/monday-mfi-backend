const { z } = require('zod');

const createSchema = z.object({
    fee_type: z.string().max(50),
    fee_name: z.string().max(100),
    calc_method: z.string().max(30),
    rate: z.number().optional().nullable(),
    fixed_amount: z.number().optional().nullable(),
    min_amount: z.number().optional().nullable(),
    max_amount: z.number().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    description: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'it_fee_configs',
};
