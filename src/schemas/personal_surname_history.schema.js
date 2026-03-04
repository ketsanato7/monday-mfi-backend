const { z } = require('zod');

// ===== personal_surname_history =====

const createSchema = z.object({
    person_id: z.number().int().optional().nullable(),
    old_surname_la: z.string().max(255).optional().nullable(),
    old_surname_en: z.string().max(255).optional().nullable(),
    change_date: z.string().optional().nullable(),
    remarks: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    old_surname_la: z.string().max(255).optional().nullable(),
    old_surname_en: z.string().max(255).optional().nullable(),
    change_date: z.string().optional().nullable(),
    remarks: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'personal_surname_history',
};
