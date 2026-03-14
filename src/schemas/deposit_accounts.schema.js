const { z } = require('zod');

// ===== deposit_accounts =====

const createSchema = z.object({
    account_no: z.string().max(100),
    product_id: z.number().int().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    opening_date: z.string().optional().nullable(),
    account_status: z.string().max(20).optional().nullable(),
    current_balance: z.number().optional().nullable(),
    accrued_interest: z.number().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    officer_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    account_no: z.string().max(100),
    product_id: z.number().int().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    opening_date: z.string().optional().nullable(),
    account_status: z.string().max(20).optional().nullable(),
    current_balance: z.number().optional().nullable(),
    accrued_interest: z.number().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    officer_id: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'deposit_accounts',
};
