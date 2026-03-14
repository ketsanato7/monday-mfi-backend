const { z } = require('zod');

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    leave_type_id: z.number().int().optional().nullable(),
    year: z.number().int(),
    entitled_days: z.number(),
    used_days: z.number().optional().nullable(),
    carried_over: z.number().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'leave_balances',
};
