const { z } = require('zod');

// ===== addresses =====

const createSchema = z.object({
    person_id: z.number().int().optional().nullable(),
    house_no: z.string().max(100).optional().nullable(),
    unit: z.string().max(100).optional().nullable(),
    village_id: z.number().int().optional().nullable(),
    address_type: z.string().max(50).optional().nullable(),
    enterprise_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    person_id: z.number().int().optional().nullable(),
    house_no: z.string().max(100).optional().nullable(),
    unit: z.string().max(100).optional().nullable(),
    village_id: z.number().int().optional().nullable(),
    address_type: z.string().max(50).optional().nullable(),
    created_at: z.string().optional().nullable(),
    enterprise_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'addresses',
};
