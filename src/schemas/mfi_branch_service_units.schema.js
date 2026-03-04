const { z } = require('zod');

// ===== mfi_branch_service_units =====

const createSchema = z.object({
    mfi_branch_id: z.string().max(100),
    service_unit_id: z.string().max(100),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    mfi_branch_id: z.string().max(100),
    service_unit_id: z.string().max(100),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'mfi_branch_service_units',
};
