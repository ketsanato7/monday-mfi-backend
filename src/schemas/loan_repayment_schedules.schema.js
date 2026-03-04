const { z } = require('zod');

// ===== loan_repayment_schedules =====

const createSchema = z.object({
    contract_id: z.number().int().optional().nullable(),
    installment_no: z.number().int(),
    due_date: z.string(),
    principal_due: z.number(),
    interest_due: z.number(),
    is_paid: z.boolean().optional().nullable(),
    total_amount: z.number().optional().nullable(),
    paid_amount: z.number().optional().nullable(),
    paid_principal: z.number().optional().nullable(),
    paid_interest: z.number().optional().nullable(),
    penalty_amount: z.number().optional().nullable(),
    paid_penalty: z.number().optional().nullable(),
    status: z.string().max(20).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contract_id: z.number().int().optional().nullable(),
    installment_no: z.number().int(),
    due_date: z.string(),
    principal_due: z.number(),
    interest_due: z.number(),
    is_paid: z.boolean().optional().nullable(),
    created_at: z.string().optional().nullable(),
    total_amount: z.number().optional().nullable(),
    paid_amount: z.number().optional().nullable(),
    paid_principal: z.number().optional().nullable(),
    paid_interest: z.number().optional().nullable(),
    penalty_amount: z.number().optional().nullable(),
    paid_penalty: z.number().optional().nullable(),
    status: z.string().max(20).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_repayment_schedules',
};
