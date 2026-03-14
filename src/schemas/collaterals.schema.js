const { z } = require('zod');

// ===== collaterals =====

const createSchema = z.object({
    category_id: z.number().int(),
    name: z.string().max(1000),
    collateral_no: z.string().max(1000),
    date_of_issue: z.string(),
    value: z.string().max(1000),
    other_details: z.string().max(1000),
    appraised_value: z.number().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    appraisal_date: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    category_id: z.number().int(),
    name: z.string().max(1000),
    collateral_no: z.string().max(1000),
    date_of_issue: z.string(),
    value: z.string().max(1000),
    other_details: z.string().max(1000),
    appraised_value: z.number().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    appraisal_date: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'collaterals',
};
