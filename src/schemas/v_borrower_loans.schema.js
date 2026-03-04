const { z } = require('zod');

// ===== v_borrower_loans =====

const createSchema = z.object({
    loan_id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    account_number: z.string().max(50).optional().nullable(),
    from_date: z.string().optional().nullable(),
    to_date: z.string().optional().nullable(),
    approved_balance: z.number().optional().nullable(),
    remaining_balance: z.number().optional().nullable(),
    interest_rate: z.number().optional().nullable(),
    loan_status: z.string().max(20).optional().nullable(),
    currency_code: z.string().max(10).optional().nullable(),
    days_past_due: z.number().int().optional().nullable(),
    classification: z.string().max(500).optional().nullable(),
    category: z.string().max(500).optional().nullable(),
    economic_sector: z.string().max(500).optional().nullable(),
    economic_branch: z.string().max(500).optional().nullable(),
    funding_source: z.string().max(500).optional().nullable(),
    use_of_loan: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    loan_id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    account_number: z.string().max(50).optional().nullable(),
    from_date: z.string().optional().nullable(),
    to_date: z.string().optional().nullable(),
    approved_balance: z.number().optional().nullable(),
    remaining_balance: z.number().optional().nullable(),
    interest_rate: z.number().optional().nullable(),
    loan_status: z.string().max(20).optional().nullable(),
    currency_code: z.string().max(10).optional().nullable(),
    days_past_due: z.number().int().optional().nullable(),
    classification: z.string().max(500).optional().nullable(),
    category: z.string().max(500).optional().nullable(),
    economic_sector: z.string().max(500).optional().nullable(),
    economic_branch: z.string().max(500).optional().nullable(),
    funding_source: z.string().max(500).optional().nullable(),
    use_of_loan: z.string().optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'v_borrower_loans',
};
