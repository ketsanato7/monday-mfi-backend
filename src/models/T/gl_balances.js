module.exports = (sequelize, DataTypes) => {
    return sequelize.define('gl_balances', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
        fiscal_period_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        branch_id: { type: DataTypes.STRING(50), unique: true },
        org_code: { type: DataTypes.STRING(255), unique: true },
        opening_debit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        opening_credit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        period_debit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        period_credit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        closing_debit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        closing_credit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        // ═══ BOL T19: ໃບດຸ່ນດ່ຽງ 6 ຫ້ອງ (ເພີ່ມໃໝ່ — ບໍ່ກະທົບ columns ເດີມ) ═══
        account_title: { type: DataTypes.STRING(500) },                                     // BoL T19.3 ຊື່ບັນຊີ
        trial_balance_debit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },           // BoL T19.4
        trial_balance_credit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },          // BoL T19.5
        adjustment_debit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },              // BoL T19.6
        adjustment_credit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },             // BoL T19.7
        adjusted_trial_balance_debit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },  // BoL T19.8
        adjusted_trial_balance_credit: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 }, // BoL T19.9
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'gl_balances', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
