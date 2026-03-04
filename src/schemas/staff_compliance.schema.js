const { z } = require('zod');

// ===== staff_compliance =====

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    kyc_training_date: z.string().optional().nullable(),
    aml_training_date: z.string().optional().nullable(),
    risk_training_date: z.string().optional().nullable(),
    background_check: z.boolean().optional().nullable(),
    disciplinary_record: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    employee_id: z.number().int().optional().nullable(),
    kyc_training_date: z.string().optional().nullable(),
    aml_training_date: z.string().optional().nullable(),
    risk_training_date: z.string().optional().nullable(),
    background_check: z.boolean().optional().nullable(),
    disciplinary_record: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'staff_compliance',
};
