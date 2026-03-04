const { z } = require('zod');

// ===== iif_headers =====

const createSchema = z.object({
    bank_code: z.string().max(2),
    submission_period: z.string().max(7),
    total_a_records: z.number().int().optional().nullable(),
    total_b_records: z.number().int().optional().nullable(),
    total_c_records: z.number().int().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    bank_code: z.string().max(2),
    submission_period: z.string().max(7),
    total_a_records: z.number().int().optional().nullable(),
    total_b_records: z.number().int().optional().nullable(),
    total_c_records: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'iif_headers',
};
