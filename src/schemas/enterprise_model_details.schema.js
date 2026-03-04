const { z } = require('zod');

// ===== enterprise_model_details =====

const createSchema = z.object({
    id: z.number().int(),
    value: z.string().optional().nullable(),
    value_en: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    enterprise_model_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int(),
    value: z.string().optional().nullable(),
    value_en: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable(),
    enterprise_model_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'enterprise_model_details',
};
