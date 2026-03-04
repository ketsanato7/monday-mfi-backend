const { z } = require('zod');

// ===== lao_id_cards =====

const createSchema = z.object({
    card_no: z.string().max(100),
    card_name: z.string().max(500).optional().nullable(),
    date_of_issue: z.string().optional().nullable(),
    exp_date: z.string().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    file_url: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    card_no: z.string().max(100),
    card_name: z.string().max(500).optional().nullable(),
    date_of_issue: z.string().optional().nullable(),
    exp_date: z.string().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    file_url: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'lao_id_cards',
};
