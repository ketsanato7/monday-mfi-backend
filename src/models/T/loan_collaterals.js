module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_collaterals', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        collateral_id: { type: DataTypes.BIGINT, allowNull: false },
        loan_id: { type: DataTypes.BIGINT, allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_collaterals', createdAt: 'created_at', updatedAt: 'updated_at' });
};
