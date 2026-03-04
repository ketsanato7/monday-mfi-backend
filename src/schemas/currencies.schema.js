const { z } = require('zod');

// ===== currencies =====

const createSchema = z.object({
    code: z.string().max(3),
    name: z.string().max(100).optional().nullable(),
    symbol: z.string().max(10).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    code: z.string().max(3),
    name: z.string().max(100).optional().nullable(),
    symbol: z.string().max(10).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'currencies',
};
