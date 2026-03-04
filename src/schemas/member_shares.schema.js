const { z } = require('zod');

// ===== member_shares =====

const createSchema = z.object({
    member_type_id: z.number().int(),
    from_date: z.string(),
    to_date: z.string(),
    initial_contribution: z.string().max(1000),
    contribution: z.string().max(1000),
    withdrawal: z.string().max(1000),
    remaining_balance: z.string().max(1000),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    member_type_id: z.number().int(),
    from_date: z.string(),
    to_date: z.string(),
    initial_contribution: z.string().max(1000),
    contribution: z.string().max(1000),
    withdrawal: z.string().max(1000),
    remaining_balance: z.string().max(1000),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'member_shares',
};
