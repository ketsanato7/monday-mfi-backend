module.exports = (sequelize, DataTypes) => {
    const RolePermissions = sequelize.define('role_permissions', {
        role_id: { type: DataTypes.INTEGER, primaryKey: true },
        permission_id: { type: DataTypes.INTEGER, primaryKey: true },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'role_permissions', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    RolePermissions.associate = (models) => {
        RolePermissions.belongsTo(models.roles, { foreignKey: 'role_id', as: 'role' });
        RolePermissions.belongsTo(models.permissions, { foreignKey: 'permission_id', as: 'permission' });
    };

    return RolePermissions;
};
