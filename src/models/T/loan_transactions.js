/**
 * loan_transactions — ບັນທຶກທຸລະກຳເງິນກູ້
 * ✅ BOL/LCIC compliant: branch_id STRING(50), installment tracking
 */
module.exports = (sequelize, DataTypes) => {
    const LoanTransactions = sequelize.define('loan_transactions', {
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
        processed_by: { type: DataTypes.INTEGER },
        // ═══ BOL/LCIC Compliant Fields ═══
        installment_no: { type: DataTypes.INTEGER },                    // ງວດທີ (BOL repayment tracking)
        branch_id: { type: DataTypes.STRING(50) },                      // FK → mfi_branches_info.id (BOL format)
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'loan_transactions', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    LoanTransactions.associate = (models) => {
        LoanTransactions.belongsTo(models.loan_contracts, { foreignKey: 'contract_id', as: 'contract' });
        LoanTransactions.belongsTo(models.mfi_branches_info, { foreignKey: 'branch_id', as: 'branch' });
    };

    return LoanTransactions;
};
