module.exports = (sequelize, DataTypes) => {
    return sequelize.define('roles', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT },
        is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'roles', createdAt: 'created_at', updatedAt: 'updated_at' });
};
