module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collaterals', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        category_id: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING(1000), allowNull: false },
        collateral_no: { type: DataTypes.STRING(1000), allowNull: false },
        date_of_issue: { type: DataTypes.DATEONLY, allowNull: false },
        value: { type: DataTypes.STRING(1000), allowNull: false },
        other_details: { type: DataTypes.STRING(1000), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'collaterals', createdAt: 'created_at', updatedAt: 'updated_at' });
};
