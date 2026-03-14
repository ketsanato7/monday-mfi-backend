const { z } = require('zod');

const createSchema = z.object({
    payroll_id: z.number().int().optional().nullable(),
    item_type: z.string().max(50),
    item_code: z.string().max(50),
    item_name: z.string().max(255).optional().nullable(),
    amount: z.number(),
    note: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'payroll_details',
};
