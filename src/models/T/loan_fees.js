module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_fees', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        loan_id: { type: DataTypes.BIGINT },
        fee_type: { type: DataTypes.STRING(255), allowNull: false },
        fee_amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
        deducted_from_loan: { type: DataTypes.BOOLEAN, defaultValue: false },
        notes: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_fees', createdAt: 'created_at', updatedAt: 'updated_at' });
};
