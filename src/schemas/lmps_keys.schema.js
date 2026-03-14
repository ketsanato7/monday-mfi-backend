const { z } = require('zod');

const lmpsKeysSchema = z.object({
    key_type: z.enum(['MEMBER_PRIVATE', 'MEMBER_PUBLIC', 'LAPNET_PUBLIC']),
    key_name: z.string().max(100),
    key_data: z.string(),
    algorithm: z.string().max(50).optional().nullable(),
    key_size: z.number().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    member_code: z.string().max(16).optional().nullable(),
    expires_at: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

module.exports = { lmpsKeysSchema };
