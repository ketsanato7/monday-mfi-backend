module.exports = (sequelize, DataTypes) => {
    return sequelize.define('role_permissions', {
        role_id: { type: DataTypes.INTEGER, primaryKey: true },
        permission_id: { type: DataTypes.INTEGER, primaryKey: true },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'role_permissions', createdAt: 'created_at', updatedAt: 'updated_at' });
};
