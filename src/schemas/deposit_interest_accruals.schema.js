const { z } = require('zod');

const createSchema = z.object({
    account_id: z.number().int(),
    accrual_date: z.string(),
    balance_used: z.number(),
    annual_rate: z.number(),
    daily_rate: z.number(),
    accrued_amount: z.number(),
    cumulative_amount: z.number(),
    status: z.string().max(30).optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'deposit_interest_accruals',
};
