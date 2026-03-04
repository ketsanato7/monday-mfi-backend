const { z } = require('zod');

// ===== iif_collateral_details =====

const createSchema = z.object({
    collateral_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    currency_code: z.string().max(3).optional().nullable(),
    status_code: z.string().max(10).optional().nullable(),
    land_unit_code: z.string().max(10).optional().nullable(),
    land_map_code: z.string().max(100).optional().nullable(),
    street_en: z.string().max(255).optional().nullable(),
    street_la: z.string().max(255).optional().nullable(),
    account_no: z.string().max(100).optional().nullable(),
    account_type_code: z.string().max(10).optional().nullable(),
    machine_type: z.string().max(100).optional().nullable(),
    machine_no: z.string().max(100).optional().nullable(),
    ministry_name: z.string().max(255).optional().nullable(),
    project_number: z.string().max(100).optional().nullable(),
    plate_number: z.string().max(50).optional().nullable(),
    engine_number: z.string().max(100).optional().nullable(),
    body_number: z.string().max(100).optional().nullable(),
    vehicle_model: z.string().max(100).optional().nullable(),
    guarantor_person_id: z.number().int().optional().nullable(),
    guarantor_enterprise_id: z.number().int().optional().nullable(),
    weight_unit: z.string().max(50).optional().nullable(),
    deleted_at: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    collateral_id: z.number().int(),
    branch_id: z.string().max(50).optional().nullable(),
    currency_code: z.string().max(3).optional().nullable(),
    status_code: z.string().max(10).optional().nullable(),
    land_unit_code: z.string().max(10).optional().nullable(),
    land_map_code: z.string().max(100).optional().nullable(),
    street_en: z.string().max(255).optional().nullable(),
    street_la: z.string().max(255).optional().nullable(),
    account_no: z.string().max(100).optional().nullable(),
    account_type_code: z.string().max(10).optional().nullable(),
    machine_type: z.string().max(100).optional().nullable(),
    machine_no: z.string().max(100).optional().nullable(),
    ministry_name: z.string().max(255).optional().nullable(),
    project_number: z.string().max(100).optional().nullable(),
    plate_number: z.string().max(50).optional().nullable(),
    engine_number: z.string().max(100).optional().nullable(),
    body_number: z.string().max(100).optional().nullable(),
    vehicle_model: z.string().max(100).optional().nullable(),
    guarantor_person_id: z.number().int().optional().nullable(),
    guarantor_enterprise_id: z.number().int().optional().nullable(),
    weight_unit: z.string().max(50).optional().nullable(),
    updated_at: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    deleted_at: z.string().optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'iif_collateral_details',
};
