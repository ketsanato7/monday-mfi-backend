/**
 * Unit Tests — bol-compliance.js
 * ກວດ BoL Decree 184/G compliance functions
 */

// ——————————————————————————
// ① validateLoanCeiling
// ——————————————————————————
describe('BoL Compliance — validateLoanCeiling', () => {
    let bol;

    beforeAll(() => {
        // Mock sequelize for require
        jest.mock('../../src/models', () => ({
            sequelize: {
                query: jest.fn().mockResolvedValue([[]]),
            },
        }));
        bol = require('../../src/middleware/bol-compliance');
    });

    afterAll(() => jest.restoreAllMocks());

    test('should pass for amount within ceiling (50M LAK)', () => {
        const result = bol.validateLoanCeiling(10_000_000);
        expect(result.valid).toBe(true);
    });

    test('should pass for amount exactly at ceiling (50M LAK)', () => {
        const result = bol.validateLoanCeiling(50_000_000);
        expect(result.valid).toBe(true);
    });

    test('should FAIL for amount exceeding ceiling', () => {
        const result = bol.validateLoanCeiling(50_000_001);
        expect(result.valid).toBe(false);
        expect(result.code).toBe('BOL_CEILING_EXCEEDED');
        expect(result.limit).toBe(50_000_000);
    });

    test('should FAIL for zero amount (BoL requires > 0)', () => {
        const result = bol.validateLoanCeiling(0);
        expect(result.valid).toBe(false);
    });

    test('should FAIL for negative amount', () => {
        const result = bol.validateLoanCeiling(-100);
        expect(result.valid).toBe(false);
    });

    test('should handle string amount (coercion)', () => {
        const result = bol.validateLoanCeiling('30000000');
        expect(result.valid).toBe(true);
    });
});

// ——————————————————————————
// ② BOL_LIMITS constants
// ——————————————————————————
describe('BoL Compliance — BOL_LIMITS constants', () => {
    let bol;

    beforeAll(() => {
        bol = require('../../src/middleware/bol-compliance');
    });

    test('should have correct MFI ceiling (50M LAK)', () => {
        expect(bol.BOL_LIMITS.MAX_LOAN_AMOUNT).toBe(50_000_000);
    });

    test('should have correct CTR threshold (100M LAK)', () => {
        expect(bol.BOL_LIMITS.CTR_THRESHOLD).toBe(100_000_000);
    });

    test('should have correct DTI limit (40%)', () => {
        expect(bol.BOL_LIMITS.DTI_MAX_RATIO).toBe(0.40);
    });

    test('should have branch individual limit (10M LAK)', () => {
        expect(bol.BOL_LIMITS.BRANCH_INDIVIDUAL).toBe(10_000_000);
    });

    test('should have branch group limit (20M LAK)', () => {
        expect(bol.BOL_LIMITS.BRANCH_GROUP).toBe(20_000_000);
    });
});
