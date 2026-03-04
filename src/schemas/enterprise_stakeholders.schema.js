const { z } = require('zod');

// ===== enterprise_stakeholders =====

const createSchema = z.object({
    enterprise_id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    role_id: z.number().int().optional().nullable(),
    ownership_percentage: z.number().optional().nullable(),
    is_authorized_signatory: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    role_id: z.number().int().optional().nullable(),
    ownership_percentage: z.number().optional().nullable(),
    is_authorized_signatory: z.boolean().optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'enterprise_stakeholders',
};
