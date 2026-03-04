module.exports = (sequelize, DataTypes) => {
    return sequelize.define('departments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'departments', createdAt: 'created_at', updatedAt: 'updated_at' });
};
