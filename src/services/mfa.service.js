/**
 * MFA Service — TOTP Multi-Factor Authentication
 * ════════════════════════════════════════════════
 * Uses speakeasy for TOTP generation/verification.
 * Admin roles MUST enable MFA. Other roles can optionally enable.
 *
 * Flow:
 *   1. User calls POST /api/mfa/setup → gets QR code
 *   2. User scans QR in Google Authenticator / Authy
 *   3. User calls POST /api/mfa/verify → sends 6-digit code
 *   4. On login, if MFA enabled → requires code before issuing full JWT
 */
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const logger = require('../config/logger');
const crypto = require('crypto');

// Roles that MUST have MFA enabled
const MFA_REQUIRED_ROLES = ['superadmin', 'SUPER_ADMIN', 'admin', 'ADMIN', 'manager', 'BRANCH_MANAGER'];

const mfaService = {
    /**
     * Generate TOTP secret + QR code for user
     */
    async setup(userId, userName, db) {
        try {
            // Check if already has a secret
            const existing = await db.mfa_secrets.findOne({
                where: { user_id: userId }
            });

            if (existing && existing.is_enabled) {
                throw new Error('MFA already enabled. Disable first to re-setup.');
            }

            // Generate new secret
            const secret = speakeasy.generateSecret({
                name: `Monday MFI (${userName})`,
                issuer: 'Monday MFI System',
                length: 32,
            });

            // Generate backup codes (8 codes, 8 chars each)
            const backupCodes = Array.from({ length: 8 }, () =>
                crypto.randomBytes(4).toString('hex').toUpperCase()
            );

            // Save or update secret
            if (existing) {
                await existing.update({
                    secret: secret.base32,
                    is_enabled: false,
                    backup_codes: JSON.stringify(backupCodes),
                    verified_at: null,
                });
            } else {
                await db.mfa_secrets.create({
                    user_id: userId,
                    secret: secret.base32,
                    is_enabled: false,
                    backup_codes: JSON.stringify(backupCodes),
                });
            }

            // Generate QR code as data URL
            const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

            logger.audit('MFA_SETUP_INITIATED', { userId, userName });

            return {
                secret: secret.base32,
                qrCode: qrDataUrl,
                backupCodes,
                otpauth_url: secret.otpauth_url,
            };
        } catch (err) {
            logger.error('MFA setup failed', { error: err.message, userId });
            throw err;
        }
    },

    /**
     * Verify TOTP code and enable MFA
     */
    async verifyAndEnable(userId, code, db) {
        try {
            const mfa = await db.mfa_secrets.findOne({
                where: { user_id: userId }
            });

            if (!mfa) throw new Error('MFA not set up. Call /mfa/setup first.');
            if (mfa.is_enabled) throw new Error('MFA already enabled');

            const isValid = speakeasy.totp.verify({
                secret: mfa.secret,
                encoding: 'base32',
                token: code,
                window: 2, // Allow 2 time-step tolerance (60 seconds)
            });

            if (!isValid) {
                throw new Error('Invalid MFA code. Try again.');
            }

            await mfa.update({
                is_enabled: true,
                verified_at: new Date(),
            });

            logger.audit('MFA_ENABLED', { userId });
            return true;
        } catch (err) {
            logger.error('MFA verify failed', { error: err.message, userId });
            throw err;
        }
    },

    /**
     * Verify TOTP code during login (returns true/false)
     */
    async verifyCode(userId, code, db) {
        const mfa = await db.mfa_secrets.findOne({
            where: { user_id: userId, is_enabled: true }
        });

        if (!mfa) return true; // MFA not enabled, skip

        // Check backup codes first
        if (code.length === 8) {
            const backupCodes = JSON.parse(mfa.backup_codes || '[]');
            const idx = backupCodes.indexOf(code.toUpperCase());
            if (idx !== -1) {
                backupCodes.splice(idx, 1); // Remove used code
                await mfa.update({ backup_codes: JSON.stringify(backupCodes) });
                logger.audit('MFA_BACKUP_CODE_USED', { userId, remainingCodes: backupCodes.length });
                return true;
            }
        }

        // Verify TOTP
        return speakeasy.totp.verify({
            secret: mfa.secret,
            encoding: 'base32',
            token: code,
            window: 2,
        });
    },

    /**
     * Check if user has MFA enabled
     */
    async isEnabled(userId, db) {
        const mfa = await db.mfa_secrets.findOne({
            where: { user_id: userId, is_enabled: true }
        });
        return !!mfa;
    },

    /**
     * Check if role requires MFA
     */
    requiresMfa(role) {
        return MFA_REQUIRED_ROLES.includes(role);
    },

    /**
     * Disable MFA (admin action)
     */
    async disable(userId, db) {
        const mfa = await db.mfa_secrets.findOne({
            where: { user_id: userId }
        });
        if (!mfa) throw new Error('MFA not found');

        await mfa.update({ is_enabled: false, verified_at: null });
        logger.audit('MFA_DISABLED', { userId });
        return true;
    },

    /**
     * Get MFA status for user
     */
    async getStatus(userId, db) {
        const mfa = await db.mfa_secrets.findOne({
            where: { user_id: userId }
        });
        return {
            isSetup: !!mfa,
            isEnabled: mfa?.is_enabled || false,
            verifiedAt: mfa?.verified_at || null,
            backupCodesRemaining: mfa ? JSON.parse(mfa.backup_codes || '[]').length : 0,
        };
    },
};

module.exports = mfaService;
