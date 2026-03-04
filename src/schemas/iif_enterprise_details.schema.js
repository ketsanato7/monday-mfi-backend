const { z } = require('zod');

// ===== iif_enterprise_details =====

const createSchema = z.object({
    enterprise_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    group_id: z.string().max(50).optional().nullable(),
    head_of_group: z.boolean().optional().nullable(),
    tax_no: z.string().max(100).optional().nullable(),
    category_code: z.string().max(50).optional().nullable(),
    shareholder_gender: z.string().max(1).optional().nullable(),
    shareholder_firstname_en: z.string().max(255).optional().nullable(),
    shareholder_secondname_en: z.string().max(255).optional().nullable(),
    shareholder_lastname_en: z.string().max(255).optional().nullable(),
    shareholder_firstname_la: z.string().max(255).optional().nullable(),
    shareholder_lastname_la: z.string().max(255).optional().nullable(),
    gm_gender: z.string().max(1).optional().nullable(),
    gm_firstname_en: z.string().max(255).optional().nullable(),
    gm_secondname_en: z.string().max(255).optional().nullable(),
    gm_lastname_en: z.string().max(255).optional().nullable(),
    gm_firstname_la: z.string().max(255).optional().nullable(),
    gm_lastname_la: z.string().max(255).optional().nullable(),
    regulatory_capital: z.number().optional().nullable(),
    currency_code: z.string().max(3).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    enterprise_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    group_id: z.string().max(50).optional().nullable(),
    head_of_group: z.boolean().optional().nullable(),
    tax_no: z.string().max(100).optional().nullable(),
    category_code: z.string().max(50).optional().nullable(),
    shareholder_gender: z.string().max(1).optional().nullable(),
    shareholder_firstname_en: z.string().max(255).optional().nullable(),
    shareholder_secondname_en: z.string().max(255).optional().nullable(),
    shareholder_lastname_en: z.string().max(255).optional().nullable(),
    shareholder_firstname_la: z.string().max(255).optional().nullable(),
    shareholder_lastname_la: z.string().max(255).optional().nullable(),
    gm_gender: z.string().max(1).optional().nullable(),
    gm_firstname_en: z.string().max(255).optional().nullable(),
    gm_secondname_en: z.string().max(255).optional().nullable(),
    gm_lastname_en: z.string().max(255).optional().nullable(),
    gm_firstname_la: z.string().max(255).optional().nullable(),
    gm_lastname_la: z.string().max(255).optional().nullable(),
    regulatory_capital: z.number().optional().nullable(),
    currency_code: z.string().max(3).optional().nullable(),
    updated_at: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'iif_enterprise_details',
};
