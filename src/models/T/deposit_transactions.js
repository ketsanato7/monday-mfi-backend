module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_transactions', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        account_id: { type: DataTypes.INTEGER },
        transaction_date: { type: DataTypes.DATE },
        transaction_type: { type: DataTypes.STRING(50) },
        amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        balance_after: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        reference_no: { type: DataTypes.STRING(100) },
        processed_by: { type: DataTypes.INTEGER },
        remarks: { type: DataTypes.TEXT }
    }, { tableName: 'deposit_transactions', timestamps: false });
};
