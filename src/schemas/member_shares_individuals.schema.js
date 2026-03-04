const { z } = require('zod');

// ===== member_shares_individuals =====

const createSchema = z.object({
    member_shares_id: z.number().int(),
    person_id: z.number().int(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    member_shares_id: z.number().int(),
    person_id: z.number().int(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'member_shares_individuals',
};
