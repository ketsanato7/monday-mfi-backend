module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_account_types', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(100), allowNull: false },
        value_en: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(10), unique: true },
        description: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(50), defaultValue: 'ACTIVE' },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_account_types', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
