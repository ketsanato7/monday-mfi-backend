const { z } = require('zod');

// ===== marriages =====

const createSchema = z.object({
    person_id: z.number().int(),
    spouse_id: z.number().int(),
    marriage_date: z.string(),
    divorce_date: z.string().optional().nullable(),
    is_current: z.boolean().optional().nullable(),
    note: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    person_id: z.number().int(),
    spouse_id: z.number().int(),
    marriage_date: z.string(),
    divorce_date: z.string().optional().nullable(),
    is_current: z.boolean().optional().nullable(),
    note: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'marriages',
};
