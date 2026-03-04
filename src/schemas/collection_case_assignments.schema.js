const { z } = require('zod');

// ===== collection_case_assignments =====

const createSchema = z.object({
    contract_id: z.number().int(),
    officer_id: z.number().int(),
    assigned_date: z.string().optional().nullable(),
    dpd_bucket: z.string().max(20),           // 0-3, 4-15, 16-30, 31-90, 90+
    priority: z.string().max(10).optional().nullable(),  // LOW, MEDIUM, HIGH, CRITICAL
    status: z.string().max(20).optional().nullable(),    // ACTIVE, RESOLVED, ESCALATED, TRANSFERRED
    resolved_date: z.string().optional().nullable(),
    resolution_notes: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    contract_id: z.number().int().optional().nullable(),
    officer_id: z.number().int().optional().nullable(),
    dpd_bucket: z.string().max(20).optional().nullable(),
    status: z.string().max(20).optional().nullable(),
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'collection_case_assignments',
};
