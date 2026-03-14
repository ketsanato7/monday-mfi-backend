/**
 * deposit_transactions — ທຸລະກຳເງິນຝາກ
 * ✅ BOL: branch_id
 */
module.exports = (sequelize, DataTypes) => {
    const DepositTransactions = sequelize.define('deposit_transactions', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        account_id: { type: DataTypes.INTEGER },
        transaction_date: { type: DataTypes.DATE },
        transaction_type: { type: DataTypes.STRING(50) },
        amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        balance_after: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        reference_no: { type: DataTypes.STRING(100) },
        processed_by: { type: DataTypes.INTEGER },
        remarks: { type: DataTypes.TEXT },
        // ═══ BOL ═══
        branch_id: { type: DataTypes.STRING(50) },                       // FK → mfi_branches_info.id
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_transactions', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    DepositTransactions.associate = (models) => {
        DepositTransactions.belongsTo(models.deposit_accounts, { foreignKey: 'account_id', as: 'account' });
        DepositTransactions.belongsTo(models.mfi_branches_info, { foreignKey: 'branch_id', as: 'branch' });
    };

    return DepositTransactions;
};
