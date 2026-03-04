const { z } = require('zod');

// ===== deposit_account_owners =====

const createSchema = z.object({
    account_id: z.number().int(),
    person_id: z.number().int().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    account_id: z.number().int(),
    person_id: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'deposit_account_owners',
};
