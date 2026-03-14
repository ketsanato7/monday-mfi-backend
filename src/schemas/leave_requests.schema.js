const { z } = require('zod');

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    leave_type_id: z.number().int().optional().nullable(),
    start_date: z.string(),
    end_date: z.string(),
    total_days: z.number(),
    reason: z.string().optional().nullable(),
    status: z.string().max(30).optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'leave_requests',
};
