const { z } = require('zod');

// ===== employee_branch_assignments =====

const createSchema = z.object({
    employee_id: z.number().int(),
    mfi_branch_id: z.string().max(255),
    department_id: z.number().int().optional().nullable(),
    position_id: z.number().int().optional().nullable(),
    assigned_date: z.string(),
    end_date: z.string().optional().nullable(),
    status: z.string().max(255),
    remark: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    employee_id: z.number().int(),
    mfi_branch_id: z.string().max(255),
    department_id: z.number().int().optional().nullable(),
    position_id: z.number().int().optional().nullable(),
    assigned_date: z.string(),
    end_date: z.string().optional().nullable(),
    status: z.string().max(255),
    remark: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'employee_branch_assignments',
};
