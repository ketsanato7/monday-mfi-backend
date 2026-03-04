const { z } = require('zod');

// ===== payrolls =====

const createSchema = z.object({
    employee_id: z.number().int().optional().nullable(),
    payroll_month: z.string(),
    basic_salary: z.number().optional().nullable(),
    allowance: z.number().optional().nullable(),
    ot: z.number().optional().nullable(),
    bonus: z.number().optional().nullable(),
    deduction: z.number().optional().nullable(),
    social_security: z.number().optional().nullable(),
    tax: z.number().optional().nullable(),
    net_salary: z.number().optional().nullable(),
    pay_date: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    employee_id: z.number().int().optional().nullable(),
    payroll_month: z.string(),
    basic_salary: z.number().optional().nullable(),
    allowance: z.number().optional().nullable(),
    ot: z.number().optional().nullable(),
    bonus: z.number().optional().nullable(),
    deduction: z.number().optional().nullable(),
    social_security: z.number().optional().nullable(),
    tax: z.number().optional().nullable(),
    net_salary: z.number().optional().nullable(),
    pay_date: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'payrolls',
};
