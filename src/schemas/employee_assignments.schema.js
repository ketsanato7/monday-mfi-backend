const { z } = require('zod');

// ===== employee_assignments =====

const createSchema = z.object({
    employee_id: z.number().int(),
    mfi_id: z.number().int().optional().nullable(),
    branch_id: z.string().max(100).optional().nullable(),
    service_unit_id: z.string().max(100).optional().nullable(),
    department_id: z.number().int().optional().nullable(),
    start_date: z.string(),
    end_date: z.string().optional().nullable(),
    is_current: z.boolean().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    employee_id: z.number().int(),
    mfi_id: z.number().int().optional().nullable(),
    branch_id: z.string().max(100).optional().nullable(),
    service_unit_id: z.string().max(100).optional().nullable(),
    department_id: z.number().int().optional().nullable(),
    start_date: z.string(),
    end_date: z.string().optional().nullable(),
    is_current: z.boolean().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'employee_assignments',
};
