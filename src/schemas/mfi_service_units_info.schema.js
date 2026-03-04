const { z } = require('zod');

// ===== mfi_service_units_info =====

const createSchema = z.object({
    id: z.string().max(255),
    approved_date: z.string(),
    name__l_a: z.string().max(255),
    name__e_n: z.string().max(255),
    village_id: z.number().int(),
    address: z.string().max(255),
    house_unit: z.string().max(255),
    house_no: z.string().max(255),
    license_no: z.string().max(255),
    employees: z.number().int(),
    employees_female: z.number().int(),
    tel: z.string().max(255),
    mobile: z.string().max(255),
    fax: z.string().max(255),
    email: z.string().max(255),
    whatsapp: z.string().max(255),
    website: z.string().max(255),
    other_infos: z.string().max(255),
    latitude: z.string().max(255),
    longitude: z.string().max(255),
    mfi_info_id: z.number().int().optional().nullable(),
    mfi_branches_info_id: z.number().int().optional().nullable(),
    service_units: z.string().max(255).optional().nullable(),
    branches: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.string().max(255),
    approved_date: z.string(),
    name__l_a: z.string().max(255),
    name__e_n: z.string().max(255),
    village_id: z.number().int(),
    address: z.string().max(255),
    house_unit: z.string().max(255),
    house_no: z.string().max(255),
    license_no: z.string().max(255),
    employees: z.number().int(),
    employees_female: z.number().int(),
    tel: z.string().max(255),
    mobile: z.string().max(255),
    fax: z.string().max(255),
    email: z.string().max(255),
    whatsapp: z.string().max(255),
    website: z.string().max(255),
    other_infos: z.string().max(255),
    latitude: z.string().max(255),
    longitude: z.string().max(255),
    mfi_info_id: z.number().int().optional().nullable(),
    mfi_branches_info_id: z.number().int().optional().nullable(),
    service_units: z.string().max(255).optional().nullable(),
    branches: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'mfi_service_units_info',
};
