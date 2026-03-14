/**
 * collaterals — ຫຼັກຊັບຄ້ຳປະກັນ
 * ✅ BOL: appraised_value, currency_id, appraisal_date
 */
module.exports = (sequelize, DataTypes) => {
    const Collaterals = sequelize.define('collaterals', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        category_id: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING(1000), allowNull: false },
        collateral_no: { type: DataTypes.STRING(1000), allowNull: false },
        date_of_issue: { type: DataTypes.DATEONLY, allowNull: false },
        value: { type: DataTypes.STRING(1000), allowNull: false },           // ເກັບໄວ້ (backward compat)
        value_amount: { type: DataTypes.DECIMAL(20, 2) },                     // BoL T6.6 — ມູນຄ່າເປັນຕົວເລກ (DECIMAL)
        other_details: { type: DataTypes.STRING(1000), allowNull: false },
        // ═══ BOL ═══
        appraised_value: { type: DataTypes.DECIMAL(20, 2) },             // ມູນຄ່າປະເມີນ (BOL ຕ້ອງ)
        currency_id: { type: DataTypes.INTEGER },                        // FK → currencies.id
        appraisal_date: { type: DataTypes.DATEONLY },                    // ວັນປະເມີນ
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'collaterals', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    Collaterals.associate = (models) => {
        if (models.collateral_categories) Collaterals.belongsTo(models.collateral_categories, { foreignKey: 'category_id', as: 'category' });
        if (models.currencies) Collaterals.belongsTo(models.currencies, { foreignKey: 'currency_id', as: 'currency' });
        if (models.loan_collaterals) Collaterals.hasMany(models.loan_collaterals, { foreignKey: 'collateral_id', as: 'loanLinks' });
    };

    return Collaterals;
};
