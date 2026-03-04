const { z } = require('zod');

// ===== contact_details =====

const createSchema = z.object({
    person_id: z.number().int().optional().nullable(),
    contact_type: z.string().max(50).optional().nullable(),
    contact_value: z.string().max(255),
    is_primary: z.boolean().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    contact_type: z.string().max(50).optional().nullable(),
    contact_value: z.string().max(255),
    is_primary: z.boolean().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'contact_details',
};
