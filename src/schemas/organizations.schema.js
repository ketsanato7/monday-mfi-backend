const { z } = require('zod');

// ===== organizations =====

const createSchema = z.object({
    code: z.string().max(255),
    name: z.string().max(255),
    business_type: z.string().max(255).optional().nullable(),
    tax_id: z.string().max(255).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    phone_number: z.string().max(255).optional().nullable(),
    logo_url: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    code: z.string().max(255),
    name: z.string().max(255),
    business_type: z.string().max(255).optional().nullable(),
    tax_id: z.string().max(255).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    phone_number: z.string().max(255).optional().nullable(),
    logo_url: z.string().max(255).optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'organizations',
};
