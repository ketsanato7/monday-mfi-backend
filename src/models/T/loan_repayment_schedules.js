/**
 * loan_repayment_schedules — ຕາຕະລາງຊຳລະ
 * ✅ BOL: branch_id
 */
module.exports = (sequelize, DataTypes) => {
    const LoanRepaymentSchedules = sequelize.define('loan_repayment_schedules', {
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
        status: { type: DataTypes.STRING(20), defaultValue: 'SCHEDULED' },
        // ═══ BOL ═══
        branch_id: { type: DataTypes.STRING(50) },                       // FK → mfi_branches_info.id
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'loan_repayment_schedules', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    LoanRepaymentSchedules.associate = (models) => {
        LoanRepaymentSchedules.belongsTo(models.loan_contracts, { foreignKey: 'contract_id', as: 'contract' });
        LoanRepaymentSchedules.belongsTo(models.mfi_branches_info, { foreignKey: 'branch_id', as: 'branch' });
    };

    return LoanRepaymentSchedules;
};
