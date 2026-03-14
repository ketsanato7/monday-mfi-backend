const { z } = require('zod');

// ===== member_shares =====
// ✅ BOL: DECIMAL money fields + branch_id

const createSchema = z.object({
    member_type_id: z.number().int(),
    from_date: z.string(),
    to_date: z.string(),
    initial_contribution: z.number().optional().nullable(),               // ✅ STRING→NUMBER
    contribution: z.number().optional().nullable(),                       // ✅ STRING→NUMBER
    withdrawal: z.number().optional().nullable(),                         // ✅ STRING→NUMBER
    remaining_balance: z.number().optional().nullable(),                   // ✅ STRING→NUMBER
    branch_id: z.string().max(50).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    member_type_id: z.number().int(),
    from_date: z.string(),
    to_date: z.string(),
    initial_contribution: z.number().optional().nullable(),
    contribution: z.number().optional().nullable(),
    withdrawal: z.number().optional().nullable(),
    remaining_balance: z.number().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
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
