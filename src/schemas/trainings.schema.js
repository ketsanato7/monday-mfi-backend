const { z } = require('zod');

// ===== trainings =====

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    course_name: z.string().max(255).optional().nullable(),
    provider: z.string().max(255).optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    certificate_file: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    employee_id: z.number().int().optional().nullable(),
    course_name: z.string().max(255).optional().nullable(),
    provider: z.string().max(255).optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    certificate_file: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'trainings',
};
