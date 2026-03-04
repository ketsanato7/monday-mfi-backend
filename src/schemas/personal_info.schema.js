const { z } = require('zod');

// ===== personal_info =====

const createSchema = z.object({
    dateofbirth: z.string().optional().nullable(),
    gender_id: z.number().int(),
    marital_status_id: z.number().int(),
    career_id: z.number().int(),
    village_id: z.number().int(),
    age: z.number().int().optional().nullable(),
    firstname__la: z.string().max(255),
    lastname__la: z.string().max(255),
    firstname__en: z.string().max(255).optional().nullable(),
    lastname__en: z.string().max(255).optional().nullable(),
    nationality_id: z.number().int(),
    home_address: z.string().max(255).optional().nullable(),
    contact_info: z.string().max(255).optional().nullable(),
    personal_code: z.string().max(255).optional().nullable(),
    phone_number: z.string().max(255).optional().nullable(),
    spouse_firstname: z.string().max(255).optional().nullable(),
    spouse_lastname: z.string().max(255).optional().nullable(),
    spouse_career_id: z.number().int().optional().nullable(),
    spouse_mobile_number: z.string().max(255).optional().nullable(),
    total_family_members: z.number().int().optional().nullable(),
    females: z.number().int().optional().nullable(),
    mobile_no: z.string().max(255).optional().nullable(),
    telephone_no: z.string().max(255).optional().nullable()
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
    id: z.number().int().optional().nullable(),
    dateofbirth: z.string().optional().nullable(),
    gender_id: z.number().int(),
    marital_status_id: z.number().int(),
    career_id: z.number().int(),
    village_id: z.number().int(),
    age: z.number().int().optional().nullable(),
    firstname__la: z.string().max(255),
    lastname__la: z.string().max(255),
    firstname__en: z.string().max(255).optional().nullable(),
    lastname__en: z.string().max(255).optional().nullable(),
    nationality_id: z.number().int(),
    home_address: z.string().max(255).optional().nullable(),
    contact_info: z.string().max(255).optional().nullable(),
    personal_code: z.string().max(255).optional().nullable(),
    phone_number: z.string().max(255).optional().nullable(),
    spouse_firstname: z.string().max(255).optional().nullable(),
    spouse_lastname: z.string().max(255).optional().nullable(),
    spouse_career_id: z.number().int().optional().nullable(),
    spouse_mobile_number: z.string().max(255).optional().nullable(),
    total_family_members: z.number().int().optional().nullable(),
    females: z.number().int().optional().nullable(),
    mobile_no: z.string().max(255).optional().nullable(),
    telephone_no: z.string().max(255).optional().nullable()
}).partial();

module.exports = {
    createSchema,
    updateSchema,
    querySchema,
    tableName: 'personal_info',
};
