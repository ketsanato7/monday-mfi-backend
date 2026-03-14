const { z } = require('zod');

// ===== deposit_transactions =====

const createSchema = z.object({
    account_id: z.number().int().optional().nullable(),
    transaction_date: z.string().optional().nullable(),
    transaction_type: z.string().max(50).optional().nullable(),
    amount: z.number(),
    balance_after: z.number(),
    reference_no: z.string().max(100).optional().nullable(),
    processed_by: z.number().int().optional().nullable(),
    remarks: z.string().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    account_id: z.number().int().optional().nullable(),
    transaction_date: z.string().optional().nullable(),
    transaction_type: z.string().max(50).optional().nullable(),
    amount: z.number(),
    balance_after: z.number(),
    reference_no: z.string().max(100).optional().nullable(),
    processed_by: z.number().int().optional().nullable(),
    remarks: z.string().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'deposit_transactions',
};
