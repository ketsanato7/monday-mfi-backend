const { z } = require('zod');

// ===== family_books =====

const createSchema = z.object({
    book_no: z.string().max(50),
    province_id: z.number().int().optional().nullable(),
    issue_date: z.string().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    book_name: z.string().max(1000).optional().nullable(),
    file_url: z.string().optional().nullable(),
    village_id: z.number().int().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    book_no: z.string().max(50),
    province_id: z.number().int().optional().nullable(),
    issue_date: z.string().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable(),
    book_name: z.string().max(1000).optional().nullable(),
    file_url: z.string().optional().nullable(),
    village_id: z.number().int().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'family_books',
};
