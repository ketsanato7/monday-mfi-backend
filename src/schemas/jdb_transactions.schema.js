const { z } = require('zod');

// ===== jdb_transactions (BOL/LCIC compliant) =====

const createSchema = z.object({
    requestId: z.string().max(255),
    partnerId: z.string().max(255).optional().nullable(),
    billNumber: z.string().max(255).optional().nullable(),
    txnAmount: z.number().optional().nullable(),
    currency: z.string().max(255).optional().nullable(),
    terminalId: z.string().max(255).optional().nullable(),
    mobileNo: z.string().max(255).optional().nullable(),
    transactionType: z.string().max(255).optional().nullable(),
    status: z.string().max(255).optional().nullable(),
    apiResponse: z.string().optional().nullable(),
    errorMessage: z.string().optional().nullable(),
    refNumber: z.string().max(255).optional().nullable(),
    emv: z.string().optional().nullable(),
    deeplink: z.string().optional().nullable(),
    // BOL/LCIC fields
    contract_id: z.number().int().optional().nullable(),
    installment_no: z.number().int().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    payment_type: z.string().max(10).optional().nullable(),
    bank_config_id: z.number().int().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    requestId: z.string().max(255),
    partnerId: z.string().max(255).optional().nullable(),
    billNumber: z.string().max(255).optional().nullable(),
    txnAmount: z.number().optional().nullable(),
    currency: z.string().max(255).optional().nullable(),
    terminalId: z.string().max(255).optional().nullable(),
    mobileNo: z.string().max(255).optional().nullable(),
    transactionType: z.string().max(255).optional().nullable(),
    status: z.string().max(255).optional().nullable(),
    apiResponse: z.string().optional().nullable(),
    errorMessage: z.string().optional().nullable(),
    refNumber: z.string().max(255).optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
    emv: z.string().optional().nullable(),
    deeplink: z.string().optional().nullable(),
    // BOL/LCIC fields
    contract_id: z.number().int().optional().nullable(),
    installment_no: z.number().int().optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    payment_type: z.string().max(10).optional().nullable(),
    bank_config_id: z.number().int().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'jdb_transactions',
};

