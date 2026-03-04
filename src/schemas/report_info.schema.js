const { z } = require('zod');

// ===== report_info =====

const createSchema = z.object({
    mfi_id: z.string().max(255).optional().nullable(),
    report_date: z.string().optional().nullable(),
    account_closing_date: z.string().optional().nullable(),
    phone: z.string().max(255).optional().nullable(),
    email: z.string().max(255).optional().nullable(),
    whatsapp: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    mfi_id: z.string().max(255).optional().nullable(),
    report_date: z.string().optional().nullable(),
    account_closing_date: z.string().optional().nullable(),
    phone: z.string().max(255).optional().nullable(),
    email: z.string().max(255).optional().nullable(),
    whatsapp: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'report_info',
};
