const { z } = require('zod');

// ===== promise_to_pay =====

const createSchema = z.object({
    contract_id: z.number().int(),
    action_id: z.number().int().optional().nullable(),
    promised_date: z.string(),
    promised_amount: z.number(),
    actual_paid_amount: z.number().optional().nullable(),
    actual_paid_date: z.string().optional().nullable(),
    status: z.string().max(20).optional().nullable(),  // PENDING, KEPT, BROKEN, PARTIAL
    created_by: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contract_id: z.number().int().optional().nullable(),
    status: z.string().max(20).optional().nullable(),
    created_by: z.number().int().optional().nullable(),
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'promise_to_pay',
};
