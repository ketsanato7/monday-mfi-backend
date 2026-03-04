module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_repayment_schedules', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        contract_id: { type: DataTypes.BIGINT },
        installment_no: { type: DataTypes.INTEGER, allowNull: false },
        due_date: { type: DataTypes.DATEONLY, allowNull: false },
        principal_due: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        interest_due: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        is_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
        created_at: { type: DataTypes.DATE },
        total_amount: { type: DataTypes.DECIMAL(20, 2) },
        paid_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        paid_principal: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        paid_interest: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        penalty_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        paid_penalty: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        status: { type: DataTypes.STRING(20), defaultValue: 'SCHEDULED' }
    }, { tableName: 'loan_repayment_schedules', timestamps: false });
};
