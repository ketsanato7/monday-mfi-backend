const { z } = require('zod');

// ===== iif_individual_details =====

const createSchema = z.object({
    person_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    group_id: z.string().max(50).optional().nullable(),
    head_of_group: z.boolean().optional().nullable(),
    familybook_province_code: z.string().max(10).optional().nullable(),
    old_surname_en: z.string().max(255).optional().nullable(),
    old_surname_la: z.string().max(255).optional().nullable(),
    spouse_firstname_en: z.string().max(255).optional().nullable(),
    spouse_secondname_en: z.string().max(255).optional().nullable(),
    spouse_lastname_en: z.string().max(255).optional().nullable(),
    spouse_firstname_la: z.string().max(255).optional().nullable(),
    spouse_lastname_la: z.string().max(255).optional().nullable(),
    lcic_customer_id: z.string().max(50).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    person_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    group_id: z.string().max(50).optional().nullable(),
    head_of_group: z.boolean().optional().nullable(),
    familybook_province_code: z.string().max(10).optional().nullable(),
    old_surname_en: z.string().max(255).optional().nullable(),
    old_surname_la: z.string().max(255).optional().nullable(),
    spouse_firstname_en: z.string().max(255).optional().nullable(),
    spouse_secondname_en: z.string().max(255).optional().nullable(),
    spouse_lastname_en: z.string().max(255).optional().nullable(),
    spouse_firstname_la: z.string().max(255).optional().nullable(),
    spouse_lastname_la: z.string().max(255).optional().nullable(),
    updated_at: z.string().optional().nullable(),
    lcic_customer_id: z.string().max(50).optional().nullable(),
    created_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'iif_individual_details',
};
