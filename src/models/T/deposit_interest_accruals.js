module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_interest_accruals', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        account_id: { type: DataTypes.INTEGER, allowNull: false },
        accrual_date: { type: DataTypes.DATEONLY, allowNull: false },
        balance_used: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        annual_rate: { type: DataTypes.DECIMAL(10,6), allowNull: false },
        daily_rate: { type: DataTypes.DECIMAL(10,8), allowNull: false },
        accrued_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        cumulative_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        journal_entry_id: { type: DataTypes.BIGINT },
        status: { type: DataTypes.STRING(30) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_interest_accruals', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
