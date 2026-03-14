module.exports = (sequelize, DataTypes) => {
    return sequelize.define('bank_code', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        bank_code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        bank: { type: DataTypes.STRING(255) },
        name_e: { type: DataTypes.STRING(255) },
        name_l: { type: DataTypes.STRING(255) },
        bank_type_id: { type: DataTypes.INTEGER },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'bank_code', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
