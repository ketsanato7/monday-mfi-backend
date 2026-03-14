module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define('users', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        username: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        password_hash: { type: DataTypes.STRING(255), allowNull: false },
        employee_id: { type: DataTypes.INTEGER, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        last_login: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'users', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    Users.associate = (models) => {
        Users.belongsTo(models.employees, { foreignKey: 'employee_id', as: 'employee' });
        Users.hasMany(models.user_roles, { foreignKey: 'user_id', as: 'userRoles' });
    };

    return Users;
};
