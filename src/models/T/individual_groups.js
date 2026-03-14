module.exports = (sequelize, DataTypes) => {
    return sequelize.define('individual_groups', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        group_name: { type: DataTypes.STRING(255), allowNull: false },
        village_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'individual_groups', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
