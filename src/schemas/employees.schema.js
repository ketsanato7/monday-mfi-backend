const { z } = require('zod');

// ===== employees =====

const createSchema = z.object({
    contact_info: z.string().optional().nullable(),
    education_level_id: z.number().int().optional().nullable(),
    date_of_employment: z.string().optional().nullable(),
    field_of_study: z.string().max(1000).optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    employee_code: z.string().max(50).optional().nullable(),
    hire_date: z.string().optional().nullable(),
    employment_type: z.string().max(50).optional().nullable(),
    status: z.string().max(50).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contact_info: z.string().optional().nullable(),
    education_level_id: z.number().int().optional().nullable(),
    date_of_employment: z.string().optional().nullable(),
    field_of_study: z.string().max(1000).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    employee_code: z.string().max(50).optional().nullable(),
    hire_date: z.string().optional().nullable(),
    employment_type: z.string().max(50).optional().nullable(),
    status: z.string().max(50).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'employees',
};
