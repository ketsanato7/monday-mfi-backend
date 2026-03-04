const { z } = require('zod');

// ===== loan_approval_limits =====

const createSchema = z.object({
    role_id: z.number().int(),
    max_amount: z.number(),
    currency_code: z.string().max(10),
    description: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    role_id: z.number().int(),
    max_amount: z.number(),
    currency_code: z.string().max(10),
    description: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_approval_limits',
};
