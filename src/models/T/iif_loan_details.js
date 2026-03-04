module.exports = (sequelize, DataTypes) => {
    return sequelize.define('iif_loan_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        loan_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
        branch_id: { type: DataTypes.STRING(50) },
        product_id: { type: DataTypes.STRING(50) },
        loan_account_no: { type: DataTypes.STRING(100) },
        purpose_code: { type: DataTypes.STRING(10) },
        loan_status_code: { type: DataTypes.STRING(10) },
        outstanding_interest: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        past_due_date: { type: DataTypes.DATEONLY },
        past_due_principal: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        past_due_interest: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        updated_at: { type: DataTypes.DATE },
        loan_status_literal: { type: DataTypes.STRING(20), defaultValue: 'Active' },
        lcic_loan_id: { type: DataTypes.STRING(50) },
        created_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'iif_loan_details', createdAt: 'created_at', updatedAt: 'updated_at' });
};
