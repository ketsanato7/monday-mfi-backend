const { z } = require('zod');

// ===== enterprise_info =====

const createSchema = z.object({
    name__e_n: z.string().max(255),
    register_no: z.string().max(255),
    date_of_issue: z.string().optional().nullable(),
    registrant: z.string().max(255),
    enterprise_size_id: z.number().int().optional().nullable(),
    village_id: z.number().int().optional().nullable(),
    name__l_a: z.string().max(255),
    tax_no: z.string().max(255).optional().nullable(),
    mobile_no: z.string().max(255).optional().nullable(),
    telephone_no: z.string().max(255).optional().nullable(),
    registration_place_issue: z.string().max(255).optional().nullable(),
    regulatory_capital: z.number().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    enterprise_type_id: z.number().int().optional().nullable(),
    enterprise_model_detail_id: z.number().int().optional().nullable(),
    economic_sector_id: z.number().int().optional().nullable(),
    economic_branch_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    name__e_n: z.string().max(255),
    register_no: z.string().max(255),
    date_of_issue: z.string().optional().nullable(),
    registrant: z.string().max(255),
    enterprise_size_id: z.number().int().optional().nullable(),
    village_id: z.number().int().optional().nullable(),
    name__l_a: z.string().max(255),
    tax_no: z.string().max(255).optional().nullable(),
    mobile_no: z.string().max(255).optional().nullable(),
    telephone_no: z.string().max(255).optional().nullable(),
    registration_place_issue: z.string().max(255).optional().nullable(),
    regulatory_capital: z.number().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    enterprise_type_id: z.number().int().optional().nullable(),
    enterprise_model_detail_id: z.number().int().optional().nullable(),
    economic_sector_id: z.number().int().optional().nullable(),
    economic_branch_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'enterprise_info',
};
