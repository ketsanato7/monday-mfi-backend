const { z } = require('zod');

// ===== loan_ecl_staging =====

const createSchema = z.object({
    loan_id: z.number().int(),
    assessment_date: z.string(),
    stage: z.number().int(),
    days_past_due: z.number().int().optional().nullable(),
    probability_of_default: z.number().optional().nullable(),
    loss_given_default: z.number().optional().nullable(),
    exposure_at_default: z.number().optional().nullable(),
    ecl_amount: z.number().optional().nullable(),
    previous_stage: z.number().int().optional().nullable(),
    org_code: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_id: z.number().int(),
    assessment_date: z.string(),
    stage: z.number().int(),
    days_past_due: z.number().int().optional().nullable(),
    probability_of_default: z.number().optional().nullable(),
    loss_given_default: z.number().optional().nullable(),
    exposure_at_default: z.number().optional().nullable(),
    ecl_amount: z.number().optional().nullable(),
    previous_stage: z.number().int().optional().nullable(),
    org_code: z.string().max(255).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_ecl_staging',
};
