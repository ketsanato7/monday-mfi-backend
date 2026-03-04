const { z } = require('zod');

// ===== loan_approval_history =====

const createSchema = z.object({
    contract_id: z.number().int(),
    user_id: z.number().int(),
    action: z.string().max(50),
    from_status: z.string().max(50).optional().nullable(),
    to_status: z.string().max(50),
    comments: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contract_id: z.number().int(),
    user_id: z.number().int(),
    action: z.string().max(50),
    from_status: z.string().max(50).optional().nullable(),
    to_status: z.string().max(50),
    comments: z.string().optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_approval_history',
};
