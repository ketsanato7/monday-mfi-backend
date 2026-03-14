/**
 * Unit Tests — crudFactory.js helpers
 * ກວດ helper functions: parsePagination, stripSensitive, validate
 */
const { validate } = require('../../src/utils/crudFactory');
const { z } = require('zod');

// ——————————————————————————
// ① Zod validate middleware
// ——————————————————————————
describe('crudFactory — validate middleware', () => {
    const schema = z.object({
        name: z.string().min(1),
        amount: z.number().positive(),
    });

    const mockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    test('should pass valid data through', () => {
        const middleware = validate(schema);
        const req = { body: { name: 'Test', amount: 100 } };
        const res = mockRes();
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body).toEqual({ name: 'Test', amount: 100 });
    });

    test('should return 400 for invalid data', () => {
        const middleware = validate(schema);
        const req = { body: { name: '', amount: -1 } };
        const res = mockRes();
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: false, message: 'Validation failed' })
        );
    });

    test('should pass-through when no schema provided', () => {
        const middleware = validate(null);
        const req = { body: { anything: true } };
        const res = mockRes();
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});

// ——————————————————————————
// ② Zod schema validation (districts example)
// ——————————————————————————
describe('Zod Schema — districts', () => {
    const { createSchema, updateSchema } = require('../../src/schemas/districts.schema');

    test('should validate correct district data', () => {
        const result = createSchema.safeParse({
            value: 'ເມືອງໄຊເສດ',
            province_id: 1,
        });
        expect(result.success).toBe(true);
    });

    test('should fail when required field missing', () => {
        const result = createSchema.safeParse({
            value: 'Test',
            // province_id missing
        });
        expect(result.success).toBe(false);
    });

    test('updateSchema should allow partial updates', () => {
        const result = updateSchema.safeParse({
            value: 'Updated Name',
        });
        expect(result.success).toBe(true);
    });

    test('updateSchema should accept empty object', () => {
        const result = updateSchema.safeParse({});
        expect(result.success).toBe(true);
    });
});
