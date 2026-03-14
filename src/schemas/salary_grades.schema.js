const { z } = require('zod');

const createSchema = z.object({
    grade_code: z.string().max(20),
    step: z.number().int().optional().nullable(),
    base_salary: z.number(),
    description: z.string().max(255).optional().nullable(),
    employee_type: z.string().max(50),
    is_active: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'salary_grades',
};
