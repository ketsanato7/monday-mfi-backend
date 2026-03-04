module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collateral_enterprises', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        enterprise_id: { type: DataTypes.INTEGER, allowNull: false },
        collateral_id: { type: DataTypes.INTEGER, allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'collateral_enterprises', createdAt: 'created_at', updatedAt: 'updated_at' });
};
