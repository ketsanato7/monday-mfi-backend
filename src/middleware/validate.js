/**
 * validate.js — Zod validation middleware
 * ── ໃຊ້: router.post('/path', validate(schema), handler) ──
 */
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.flatten();
        return res.status(400).json({
            status: false,
            message: 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ',
            errors: errors.fieldErrors,
        });
    }
    // Replace body with validated + sanitized data
    req.body = { ...req.body, ...result.data };
    next();
};

module.exports = validate;
