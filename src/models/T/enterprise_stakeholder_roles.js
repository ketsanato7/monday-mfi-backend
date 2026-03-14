module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_stakeholder_roles', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        role_name_la: { type: DataTypes.STRING(100) },
        role_name_en: { type: DataTypes.STRING(100) },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'enterprise_stakeholder_roles', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
