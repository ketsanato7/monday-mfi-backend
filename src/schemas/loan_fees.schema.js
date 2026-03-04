const { z } = require('zod');

// ===== loan_fees =====

const createSchema = z.object({
    loan_id: z.number().int().optional().nullable(),
    fee_type: z.string().max(255),
    fee_amount: z.number().or(z.string()),
    deducted_from_loan: z.boolean().optional().default(false),
    notes: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_id: z.number().int().optional().nullable(),
    fee_type: z.string().max(255).optional().nullable(),
    fee_amount: z.number().or(z.string()).optional().nullable(),
    deducted_from_loan: z.boolean().optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_fees',
};
