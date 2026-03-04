const { z } = require('zod');

// ===== org_branches =====

const createSchema = z.object({
    code: z.string().max(255),
    name: z.string().max(255),
    org_code: z.string().max(255),
    address: z.string().max(255).optional().nullable(),
    phone_number: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    code: z.string().max(255),
    name: z.string().max(255),
    org_code: z.string().max(255),
    address: z.string().max(255).optional().nullable(),
    phone_number: z.string().max(255).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'org_branches',
};
