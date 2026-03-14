/**
 * MFA Secrets Model — TOTP Multi-Factor Authentication
 * BoL + GEMINI: ບັງຄັບ MFA ສຳລັບ admin roles
 */
module.exports = (sequelize, DataTypes) => {
    const MfaSecrets = sequelize.define('mfa_secrets', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        secret: { type: DataTypes.STRING(255), allowNull: false },
        is_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
        backup_codes: { type: DataTypes.TEXT },      // JSON array of backup codes
        verified_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
    }, {
        tableName: 'mfa_secrets',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: true,
        deletedAt: 'deleted_at'
    });

    MfaSecrets.associate = (models) => {
        MfaSecrets.belongsTo(models.users, { foreignKey: 'user_id', as: 'user' });
    };

    return MfaSecrets;
};
