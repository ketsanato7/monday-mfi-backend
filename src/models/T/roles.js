module.exports = (sequelize, DataTypes) => {
    const Roles = sequelize.define('roles', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT },
        is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'roles', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    Roles.associate = (models) => {
        Roles.hasMany(models.role_permissions, { foreignKey: 'role_id', as: 'permissions' });
        Roles.hasMany(models.role_menus, { foreignKey: 'role_id', as: 'menus' });
        Roles.hasMany(models.user_roles, { foreignKey: 'role_id', as: 'userRoles' });
    };

    return Roles;
};
