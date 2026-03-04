module.exports = (sequelize, DataTypes) => {
    return sequelize.define('users', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        username: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        password_hash: { type: DataTypes.STRING(255), allowNull: false },
        employee_id: { type: DataTypes.INTEGER, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        last_login: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'users', createdAt: 'created_at', updatedAt: 'updated_at' });
};
