const { z } = require('zod');

// ===== personal_relationships =====

const createSchema = z.object({
    person_id: z.number().int().optional().nullable(),
    relative_id: z.number().int().optional().nullable(),
    relationship_type: z.string().max(50).optional().nullable(),
    is_current: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    relative_id: z.number().int().optional().nullable(),
    relationship_type: z.string().max(50).optional().nullable(),
    is_current: z.boolean().optional().nullable(),
    created_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'personal_relationships',
};
