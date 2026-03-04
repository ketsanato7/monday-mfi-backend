const { z } = require('zod');

// ===== mfi_info =====

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
    branches: z.number().int(),
    service_units: z.number().int(),
    employees: z.number().int(),
    employees_female: z.number().int(),
    employees__h_q: z.number().int(),
    employees_female__h_q: z.number().int(),
    tel: z.string().max(255),
    mobile: z.string().max(255),
    fax: z.string().max(255),
    email: z.string().max(255),
    whatsapp: z.string().max(255),
    website: z.string().max(255),
    other_info: z.string().max(255),
    latitude: z.string().max(255),
    longitude: z.string().max(255),
    enterprise_info_id: z.number().int().optional().nullable(),
    other_infos: z.string().max(255).optional().nullable()
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
    branches: z.number().int(),
    service_units: z.number().int(),
    employees: z.number().int(),
    employees_female: z.number().int(),
    employees__h_q: z.number().int(),
    employees_female__h_q: z.number().int(),
    tel: z.string().max(255),
    mobile: z.string().max(255),
    fax: z.string().max(255),
    email: z.string().max(255),
    whatsapp: z.string().max(255),
    website: z.string().max(255),
    other_info: z.string().max(255),
    latitude: z.string().max(255),
    longitude: z.string().max(255),
    enterprise_info_id: z.number().int().optional().nullable(),
    other_infos: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'mfi_info',
};
