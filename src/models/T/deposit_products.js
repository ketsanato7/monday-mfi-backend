module.exports = (sequelize, DataTypes) => {
    const DepositProducts = sequelize.define('deposit_products', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        product_name_la: { type: DataTypes.STRING(255), allowNull: false },
        product_name_en: { type: DataTypes.STRING(255) },
        interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        minimum_balance: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        term_months: { type: DataTypes.INTEGER, defaultValue: 0 },
        currency_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_products', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    DepositProducts.associate = (models) => {
        DepositProducts.hasMany(models.deposit_accounts, { foreignKey: 'product_id', as: 'accounts' });
    };

    return DepositProducts;
};
