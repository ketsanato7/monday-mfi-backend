const { z } = require('zod');

const createSchema = z.object({
    code: z.string().max(50),
    name_la: z.string().max(255),
    name_en: z.string().max(255).optional().nullable(),
    max_days_per_year: z.number().int().optional().nullable(),
    is_paid: z.boolean().optional().nullable(),
    requires_document: z.boolean().optional().nullable(),
    gender_restriction: z.string().max(20).optional().nullable(),
    is_active: z.boolean().optional().nullable()
});

const updateSchema = createSchema.partial();

module.exports = {
    createSchema,
    updateSchema,
    tableName: 'leave_types',
};
