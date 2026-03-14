const { z } = require('zod');

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    allowance_type_id: z.number().int().optional().nullable(),
    amount: z.number(),
    effective_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    is_active: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'employee_allowances',
};
