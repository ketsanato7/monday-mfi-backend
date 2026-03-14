const { z } = require('zod');

// ===== bank_api_configs =====

const createSchema = z.object({
    bank_code: z.string().max(20),
    bank_name: z.string().max(100),
    base_url: z.string().max(500),
    partner_id: z.string().max(100).optional().nullable(),
    client_id: z.string().max(100).optional().nullable(),
    client_secret: z.string().optional().nullable(),
    merchant_id: z.string().max(100).optional().nullable(),
    sign_secret: z.string().optional().nullable(),
    callback_url: z.string().max(500).optional().nullable(),
    is_active: z.boolean().optional().default(false),
    mfi_info_id: z.string().max(255).optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    bank_code: z.string().max(20).optional().nullable(),
    bank_name: z.string().max(100).optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    mfi_info_id: z.string().max(255).optional().nullable(),
    branch_id: z.string().max(50).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'bank_api_configs',
};
