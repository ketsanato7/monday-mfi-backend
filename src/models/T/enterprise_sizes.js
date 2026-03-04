module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_sizes', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'enterprise_sizes', createdAt: 'created_at', updatedAt: 'updated_at' });
};
