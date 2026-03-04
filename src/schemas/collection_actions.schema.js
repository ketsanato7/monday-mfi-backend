const { z } = require('zod');

// ===== collection_actions =====

const createSchema = z.object({
    contract_id: z.number().int(),
    action_type: z.string().max(50),       // CALL, SMS, VISIT, LETTER, LEGAL, SYSTEM
    action_date: z.string().optional().nullable(),
    officer_id: z.number().int().optional().nullable(),
    dpd_at_action: z.number().int().optional().nullable(),
    contact_result: z.string().max(50).optional().nullable(), // CONTACTED, NO_ANSWER, WRONG_NUMBER, PROMISE, PAID
    notes: z.string().optional().nullable(),
    next_action_date: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contract_id: z.number().int().optional().nullable(),
    action_type: z.string().max(50).optional().nullable(),
    officer_id: z.number().int().optional().nullable(),
    contact_result: z.string().max(50).optional().nullable(),
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'collection_actions',
};
