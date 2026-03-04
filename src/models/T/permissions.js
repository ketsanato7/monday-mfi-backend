module.exports = (sequelize, DataTypes) => {
    return sequelize.define('permissions', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        module: { type: DataTypes.STRING(100) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'permissions', createdAt: 'created_at', updatedAt: 'updated_at' });
};
