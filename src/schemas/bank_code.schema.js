const { z } = require('zod');

// ===== bank_code =====

const createSchema = z.object({
    bank_code: z.string().max(100),
    bank: z.string().max(255).optional().nullable(),
    name_e: z.string().max(255).optional().nullable(),
    name_l: z.string().max(255).optional().nullable(),
    bank_type_id: z.number().int().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    bank_code: z.string().max(100),
    bank: z.string().max(255).optional().nullable(),
    name_e: z.string().max(255).optional().nullable(),
    name_l: z.string().max(255).optional().nullable(),
    bank_type_id: z.number().int().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'bank_code',
};
