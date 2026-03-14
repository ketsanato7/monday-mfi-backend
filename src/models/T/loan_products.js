module.exports = (sequelize, DataTypes) => {
    const LoanProducts = sequelize.define('loan_products', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        product_name_la: { type: DataTypes.STRING(255), allowNull: false },
        product_name_en: { type: DataTypes.STRING(255) },
        interest_rate_type: { type: DataTypes.STRING(50) },
        min_interest_rate: { type: DataTypes.DECIMAL(5, 2) },
        max_interest_rate: { type: DataTypes.DECIMAL(5, 2) },
        currency_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'loan_products', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    LoanProducts.associate = (models) => {
        LoanProducts.hasMany(models.loan_contracts, { foreignKey: 'product_id', as: 'contracts' });
        LoanProducts.hasMany(models.loan_applications, { foreignKey: 'loan_product_id', as: 'applications' });
    };

    return LoanProducts;
};
