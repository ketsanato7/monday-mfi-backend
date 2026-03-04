const { z } = require('zod');

// ===== iif_cosigners =====

const createSchema = z.object({
    loan_id: z.number().int(),
    person_id: z.number().int().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable(),
    cosigner_type: z.string().max(20).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_id: z.number().int(),
    person_id: z.number().int().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable(),
    cosigner_type: z.string().max(20).optional().nullable(),
    updated_at: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'iif_cosigners',
};
