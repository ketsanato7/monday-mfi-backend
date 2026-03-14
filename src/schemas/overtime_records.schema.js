const { z } = require('zod');

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    work_date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    hours: z.number(),
    ot_type: z.string().max(30),
    rate_multiplier: z.number().optional().nullable(),
    amount: z.number().optional().nullable(),
    reason: z.string().optional().nullable(),
    status: z.string().max(30).optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'overtime_records',
};
