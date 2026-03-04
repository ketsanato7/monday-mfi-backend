module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collateral_categories', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'collateral_categories', createdAt: 'created_at', updatedAt: 'updated_at' });
};
