module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_transactions', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        contract_id: { type: DataTypes.BIGINT },
        transaction_date: { type: DataTypes.DATE },
        transaction_type: { type: DataTypes.STRING(50) },
        amount_paid: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        principal_paid: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        interest_paid: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        penalty_paid: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        payment_method: { type: DataTypes.STRING(50) },
        reference_no: { type: DataTypes.STRING(100) },
        processed_by: { type: DataTypes.INTEGER }
    }, { tableName: 'loan_transactions', timestamps: false });
};
