const { z } = require('zod');

// ===== audit_logs =====

const createSchema = z.object({
    user_id: z.number().int().optional().nullable(),
    action: z.string().max(255),
    table_name: z.string().max(255),
    record_id: z.string().max(255).optional().nullable(),
    old_values: z.any().optional().nullable(),
    new_values: z.any().optional().nullable(),
    ip_address: z.string().max(255).optional().nullable(),
    user_agent: z.string().optional().nullable(),
    description: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    user_id: z.number().int().optional().nullable(),
    action: z.string().max(255),
    table_name: z.string().max(255),
    record_id: z.string().max(255).optional().nullable(),
    old_values: z.any().optional().nullable(),
    new_values: z.any().optional().nullable(),
    ip_address: z.string().max(255).optional().nullable(),
    user_agent: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'audit_logs',
};
