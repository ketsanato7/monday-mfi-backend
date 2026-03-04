const { z } = require('zod');

// ===== trial_balance =====

const createSchema = z.object({
    id: z.number().int(),
    account_no: z.string().max(255).optional().nullable(),
    account_title: z.string().max(255).optional().nullable(),
    trial_balance_debit: z.string().max(255).optional().nullable(),
    trial_balance_credit: z.string().max(255).optional().nullable(),
    adjustment_debit: z.string().max(255).optional().nullable(),
    adjustment_credit: z.string().max(255).optional().nullable(),
    adjusted_trial_balance_debit: z.string().max(255).optional().nullable(),
    adjusted_trial_balance_credit: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int(),
    account_no: z.string().max(255).optional().nullable(),
    account_title: z.string().max(255).optional().nullable(),
    trial_balance_debit: z.string().max(255).optional().nullable(),
    trial_balance_credit: z.string().max(255).optional().nullable(),
    adjustment_debit: z.string().max(255).optional().nullable(),
    adjustment_credit: z.string().max(255).optional().nullable(),
    adjusted_trial_balance_debit: z.string().max(255).optional().nullable(),
    adjusted_trial_balance_credit: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'trial_balance',
};
