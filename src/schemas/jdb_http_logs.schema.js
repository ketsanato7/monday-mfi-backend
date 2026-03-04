const { z } = require('zod');

// ===== jdb_http_logs =====

const createSchema = z.object({
    method: z.string().max(10),
    endpoint: z.string(),
    requestHeaders: z.string().optional().nullable(),
    requestBody: z.string().optional().nullable(),
    responseStatus: z.number().int().optional().nullable(),
    responseHeaders: z.string().optional().nullable(),
    responseBody: z.string().optional().nullable(),
    duration: z.number().int().optional().nullable(),
    errorMessage: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    method: z.string().max(10),
    endpoint: z.string(),
    requestHeaders: z.string().optional().nullable(),
    requestBody: z.string().optional().nullable(),
    responseStatus: z.number().int().optional().nullable(),
    responseHeaders: z.string().optional().nullable(),
    responseBody: z.string().optional().nullable(),
    duration: z.number().int().optional().nullable(),
    errorMessage: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'jdb_http_logs',
};
