const { z } = require('zod');

// ===== enterprise_stakeholder_roles =====

const createSchema = z.object({
    role_name_la: z.string().max(100).optional().nullable(),
    role_name_en: z.string().max(100).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    role_name_la: z.string().max(100).optional().nullable(),
    role_name_en: z.string().max(100).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'enterprise_stakeholder_roles',
};
