const { z } = require('zod');

// ===== employee_positions =====

const createSchema = z.object({
    employee_id: z.number().int(),
    position_id: z.number().int(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    employee_id: z.number().int(),
    position_id: z.number().int(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'employee_positions',
};
