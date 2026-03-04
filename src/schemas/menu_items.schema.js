const { z } = require('zod');

// ===== menu_items =====

const createSchema = z.object({
    segment: z.string().max(255),
    title: z.string().max(255),
    parent_segment: z.string().max(255).optional().nullable(),
    icon: z.string().max(100).optional().nullable(),
    sort_order: z.number().int().optional().nullable(),
    is_active: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    segment: z.string().max(255),
    title: z.string().max(255),
    parent_segment: z.string().max(255).optional().nullable(),
    icon: z.string().max(100).optional().nullable(),
    sort_order: z.number().int().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'menu_items',
};
