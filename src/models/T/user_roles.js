module.exports = (sequelize, DataTypes) => {
    const UserRoles = sequelize.define('user_roles', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        role_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        assigned_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'user_roles', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    UserRoles.associate = (models) => {
        UserRoles.belongsTo(models.users, { foreignKey: 'user_id', as: 'user' });
        UserRoles.belongsTo(models.roles, { foreignKey: 'role_id', as: 'role' });
    };

    return UserRoles;
};
