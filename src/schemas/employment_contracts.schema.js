const { z } = require('zod');

// ===== employment_contracts =====

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    contract_type: z.string().max(100).optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    salary: z.number().optional().nullable(),
    probation_month: z.number().int().optional().nullable(),
    working_hours: z.number().int().optional().nullable(),
    signed_date: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    employee_id: z.number().int().optional().nullable(),
    contract_type: z.string().max(100).optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    salary: z.number().optional().nullable(),
    probation_month: z.number().int().optional().nullable(),
    working_hours: z.number().int().optional().nullable(),
    signed_date: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'employment_contracts',
};
