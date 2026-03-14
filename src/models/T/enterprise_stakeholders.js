module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_stakeholders', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        enterprise_id: { type: DataTypes.INTEGER },
        person_id: { type: DataTypes.INTEGER },
        role_id: { type: DataTypes.INTEGER },
        ownership_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
        is_authorized_signatory: { type: DataTypes.BOOLEAN, defaultValue: false },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'enterprise_stakeholders', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
