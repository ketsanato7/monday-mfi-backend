const { z } = require('zod');

// ===== loan_insurance =====

const createSchema = z.object({
    loan_id: z.number().int().optional().nullable(),
    insurance_type: z.string().max(255),
    premium: z.number().or(z.string()),
    coverage_amount: z.number().or(z.string()).optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    beneficiary: z.string().max(500).optional().nullable(),
    notes: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_id: z.number().int().optional().nullable(),
    insurance_type: z.string().max(255).optional().nullable(),
    premium: z.number().or(z.string()).optional().nullable(),
    coverage_amount: z.number().or(z.string()).optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    beneficiary: z.string().max(500).optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_insurance',
};
