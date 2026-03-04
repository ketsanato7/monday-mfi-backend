const { z } = require('zod');

// ===== loan_transactions =====

const createSchema = z.object({
    contract_id: z.number().int().optional().nullable(),
    transaction_date: z.string().optional().nullable(),
    transaction_type: z.string().max(50).optional().nullable(),
    amount_paid: z.number(),
    principal_paid: z.number().optional().nullable(),
    interest_paid: z.number().optional().nullable(),
    penalty_paid: z.number().optional().nullable(),
    payment_method: z.string().max(50).optional().nullable(),
    reference_no: z.string().max(100).optional().nullable(),
    processed_by: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contract_id: z.number().int().optional().nullable(),
    transaction_date: z.string().optional().nullable(),
    transaction_type: z.string().max(50).optional().nullable(),
    amount_paid: z.number(),
    principal_paid: z.number().optional().nullable(),
    interest_paid: z.number().optional().nullable(),
    penalty_paid: z.number().optional().nullable(),
    payment_method: z.string().max(50).optional().nullable(),
    reference_no: z.string().max(100).optional().nullable(),
    processed_by: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_transactions',
};
