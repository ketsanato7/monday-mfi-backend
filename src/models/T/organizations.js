module.exports = (sequelize, DataTypes) => {
    return sequelize.define('organizations', {
        code: { type: DataTypes.STRING(255), primaryKey: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        business_type: { type: DataTypes.STRING(255) },
        tax_id: { type: DataTypes.STRING(255) },
        address: { type: DataTypes.STRING(255) },
        phone_number: { type: DataTypes.STRING(255) },
        logo_url: { type: DataTypes.STRING(255) },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'organizations', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
