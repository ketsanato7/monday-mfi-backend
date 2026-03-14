/**
 * Unit Tests — sanitize.js middleware
 * ກວດ XSS sanitization ສຳລັບ banking security
 */
const sanitizeMiddleware = require('../../src/middleware/sanitize');

describe('Sanitize Middleware — XSS Prevention', () => {
    const mockReqRes = (body, method = 'POST') => {
        const req = { body, method };
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        const next = jest.fn();
        return { req, res, next };
    };

    test('should strip <script> tags from strings', () => {
        const { req, res, next } = mockReqRes({
            name: 'Test<script>alert("xss")</script>',
        });

        sanitizeMiddleware(req, res, next);
        expect(req.body.name).not.toContain('<script>');
        expect(next).toHaveBeenCalled();
    });

    test('should strip javascript: protocol', () => {
        const { req, res, next } = mockReqRes({
            url: 'javascript:alert(1)',
        });

        sanitizeMiddleware(req, res, next);
        expect(req.body.url).not.toContain('javascript:');
        expect(next).toHaveBeenCalled();
    });

    test('should handle nested objects', () => {
        const { req, res, next } = mockReqRes({
            address: {
                city: '<img onerror="alert(1)" src="x">Vientiane',
            },
        });

        sanitizeMiddleware(req, res, next);
        expect(req.body.address.city).not.toContain('onerror');
        expect(next).toHaveBeenCalled();
    });

    test('should leave clean strings unchanged', () => {
        const { req, res, next } = mockReqRes({
            name: 'ທ່ານ ສົມໃຈ',
            amount: 5000000,
        });

        sanitizeMiddleware(req, res, next);
        expect(req.body.name).toBe('ທ່ານ ສົມໃຈ');
        expect(req.body.amount).toBe(5000000);
        expect(next).toHaveBeenCalled();
    });

    test('should handle empty body', () => {
        const { req, res, next } = mockReqRes({});
        sanitizeMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('should handle arrays in body', () => {
        const { req, res, next } = mockReqRes({
            tags: ['<script>alert(1)</script>', 'clean-tag'],
        });

        sanitizeMiddleware(req, res, next);
        expect(req.body.tags[0]).not.toContain('<script>');
        expect(req.body.tags[1]).toBe('clean-tag');
        expect(next).toHaveBeenCalled();
    });

    test('should NOT sanitize GET requests', () => {
        const { req, res, next } = mockReqRes(
            { name: '<script>bad</script>' },
            'GET' // GET method — should skip
        );

        sanitizeMiddleware(req, res, next);
        // Body should remain unchanged for GET
        expect(req.body.name).toContain('<script>');
        expect(next).toHaveBeenCalled();
    });
});
