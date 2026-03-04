const { z } = require('zod');

// ===== passports =====

const createSchema = z.object({
    passport_no: z.string().max(1000),
    passport_name: z.string().max(1000),
    exp_date: z.string(),
    person_id: z.number().int(),
    deleted_at: z.string().optional().nullable(),
    file_url: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    passport_no: z.string().max(1000),
    passport_name: z.string().max(1000),
    exp_date: z.string(),
    person_id: z.number().int(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    file_url: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'passports',
};
