module.exports = (sequelize, DataTypes) => {
    return sequelize.define('categories', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'categories', createdAt: 'created_at', updatedAt: 'updated_at' });
};
