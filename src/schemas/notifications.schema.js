const { z } = require('zod');

// ===== notifications =====

const createSchema = z.object({
    user_id: z.number().int().optional().nullable(),
    type: z.string().max(255),
    title: z.string().max(255),
    message: z.string(),
    entity_type: z.string().max(255).optional().nullable(),
    entity_id: z.number().int().optional().nullable(),
    is_read: z.boolean().optional().nullable(),
    read_at: z.string().optional().nullable(),
    channel: z.string().max(255).optional().nullable(),
    sent_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    user_id: z.number().int().optional().nullable(),
    type: z.string().max(255),
    title: z.string().max(255),
    message: z.string(),
    entity_type: z.string().max(255).optional().nullable(),
    entity_id: z.number().int().optional().nullable(),
    is_read: z.boolean().optional().nullable(),
    read_at: z.string().optional().nullable(),
    channel: z.string().max(255).optional().nullable(),
    sent_at: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'notifications',
};
