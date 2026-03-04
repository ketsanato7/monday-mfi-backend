const { z } = require('zod');

// ===== individual_groups =====

const createSchema = z.object({
    group_name: z.string().max(255),
    village_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    group_name: z.string().max(255),
    village_id: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'individual_groups',
};
