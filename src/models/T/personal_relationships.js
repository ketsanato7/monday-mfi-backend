module.exports = (sequelize, DataTypes) => {
    return sequelize.define('personal_relationships', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER },
        relative_id: { type: DataTypes.INTEGER },
        relationship_type: { type: DataTypes.STRING(50) },
        is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'personal_relationships', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
