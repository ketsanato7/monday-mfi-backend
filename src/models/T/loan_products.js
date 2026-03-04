module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_products', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        product_name_la: { type: DataTypes.STRING(255), allowNull: false },
        product_name_en: { type: DataTypes.STRING(255) },
        interest_rate_type: { type: DataTypes.STRING(50) },
        min_interest_rate: { type: DataTypes.DECIMAL(5, 2) },
        max_interest_rate: { type: DataTypes.DECIMAL(5, 2) },
        currency_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_products', timestamps: false });
};
