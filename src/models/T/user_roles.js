module.exports = (sequelize, DataTypes) => {
    return sequelize.define('user_roles', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        role_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        assigned_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'user_roles', createdAt: 'created_at', updatedAt: 'updated_at' });
};
