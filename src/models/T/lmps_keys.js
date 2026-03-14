/**
 * lmps_keys — RSA keys ສຳລັບ LMPS/LAPNET
 * ✅ LMPS v8.7.4 Section 4.1 + 9
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('lmps_keys', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        key_type: { type: DataTypes.STRING(20), allowNull: false },           // MEMBER_PRIVATE, MEMBER_PUBLIC, LAPNET_PUBLIC
        key_name: { type: DataTypes.STRING(100), allowNull: false },          // ຊື່ key ສຳລັບ display
        key_data: { type: DataTypes.TEXT, allowNull: false },                 // PEM format
        algorithm: { type: DataTypes.STRING(50), defaultValue: 'SHA256withRSA' },
        key_size: { type: DataTypes.INTEGER, defaultValue: 2048 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        member_code: { type: DataTypes.STRING(16) },                          // ລະຫັດ LMPS member
        expires_at: { type: DataTypes.DATE },
        notes: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'lmps_keys', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
