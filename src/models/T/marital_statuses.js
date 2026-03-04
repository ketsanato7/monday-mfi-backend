module.exports = (sequelize, DataTypes) => {
    return sequelize.define('marital_statuses', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(100), allowNull: false },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'marital_statuses', createdAt: 'created_at', updatedAt: 'updated_at' });
};
