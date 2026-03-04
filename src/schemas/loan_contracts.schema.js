const { z } = require('zod');

// ===== loan_contracts =====

const createSchema = z.object({
    contract_no: z.string().max(50),
    product_id: z.number().int().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    approved_amount: z.number(),
    interest_rate: z.number(),
    term_months: z.number().int(),
    disbursement_date: z.string().optional().nullable(),
    maturity_date: z.string().optional().nullable(),
    loan_purpose_id: z.number().int().optional().nullable(),
    loan_status: z.string().max(20).optional().nullable(),
    classification_id: z.number().int().optional().nullable(),
    classification_date: z.string().optional().nullable(),
    economic_sector_id: z.number().int().optional().nullable(),
    economic_branch_id: z.number().int().optional().nullable(),
    borrower_type_id: z.number().int().optional().nullable(),
    borrower_connection_id: z.number().int().optional().nullable(),
    funding_source_id: z.number().int().optional().nullable(),
    remaining_balance: z.number().optional().nullable(),
    days_past_due: z.number().int().optional().nullable(),
    loan_type_id: z.number().int().optional().nullable(),
    loan_term_id: z.number().int().optional().nullable(),
    use_of_loan: z.string().optional().nullable(),
    allowance_losses: z.number().optional().nullable(),
    restructured_date: z.string().optional().nullable(),
    write_off_date: z.string().optional().nullable(),
    extension_date: z.string().optional().nullable(),
    funding_org: z.string().max(1000).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contract_no: z.string().max(50),
    product_id: z.number().int().optional().nullable(),
    currency_id: z.number().int().optional().nullable(),
    approved_amount: z.number(),
    interest_rate: z.number(),
    term_months: z.number().int(),
    disbursement_date: z.string().optional().nullable(),
    maturity_date: z.string().optional().nullable(),
    loan_purpose_id: z.number().int().optional().nullable(),
    loan_status: z.string().max(20).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    classification_id: z.number().int().optional().nullable(),
    classification_date: z.string().optional().nullable(),
    economic_sector_id: z.number().int().optional().nullable(),
    economic_branch_id: z.number().int().optional().nullable(),
    borrower_type_id: z.number().int().optional().nullable(),
    borrower_connection_id: z.number().int().optional().nullable(),
    funding_source_id: z.number().int().optional().nullable(),
    remaining_balance: z.number().optional().nullable(),
    days_past_due: z.number().int().optional().nullable(),
    loan_type_id: z.number().int().optional().nullable(),
    loan_term_id: z.number().int().optional().nullable(),
    use_of_loan: z.string().optional().nullable(),
    allowance_losses: z.number().optional().nullable(),
    restructured_date: z.string().optional().nullable(),
    write_off_date: z.string().optional().nullable(),
    extension_date: z.string().optional().nullable(),
    funding_org: z.string().max(1000).optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'loan_contracts',
};
