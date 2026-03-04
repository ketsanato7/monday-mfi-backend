const { z } = require('zod');

// ===== role_menus =====

const createSchema = z.object({
    role_id: z.number().int(),
    menu_item_id: z.number().int(),
    is_visible: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    role_id: z.number().int(),
    menu_item_id: z.number().int(),
    is_visible: z.boolean().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'role_menus',
};
