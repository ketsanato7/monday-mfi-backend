const { z } = require('zod');

// ===== chart_of_accounts =====

const createSchema = z.object({
    account_code: z.string().max(20),
    account_name_la: z.string().max(255),
    account_name_en: z.string().max(255).optional().nullable(),
    coa_type: z.string().max(50),
    account_type: z.string().max(50),
    level: z.number().int(),
    parent_account_id: z.number().int().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    currency_code: z.string().max(10).optional().nullable(),
    description: z.string().optional().nullable(),
    account_name_lo: z.string().max(255).optional().nullable(),
    category_id: z.number().int().optional().nullable(),
    parent_code: z.string().max(20).optional().nullable(),
    is_header: z.boolean().optional().nullable(),
    org_code: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    account_code: z.string().max(20),
    account_name_la: z.string().max(255),
    account_name_en: z.string().max(255).optional().nullable(),
    coa_type: z.string().max(50),
    account_type: z.string().max(50),
    level: z.number().int(),
    parent_account_id: z.number().int().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    currency_code: z.string().max(10).optional().nullable(),
    description: z.string().optional().nullable(),
    account_name_lo: z.string().max(255).optional().nullable(),
    category_id: z.number().int().optional().nullable(),
    parent_code: z.string().max(20).optional().nullable(),
    is_header: z.boolean().optional().nullable(),
    org_code: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'chart_of_accounts',
};
