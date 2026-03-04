const { z } = require('zod');

// ===== borrowers_enterprise =====

const createSchema = z.object({
    enterprise_id: z.number().int(),
    loan_id: z.number().int()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    enterprise_id: z.number().int(),
    loan_id: z.number().int()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'borrowers_enterprise',
};
