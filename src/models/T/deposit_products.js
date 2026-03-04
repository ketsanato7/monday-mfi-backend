module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_products', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        product_name_la: { type: DataTypes.STRING(255), allowNull: false },
        product_name_en: { type: DataTypes.STRING(255) },
        interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        minimum_balance: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        term_months: { type: DataTypes.INTEGER, defaultValue: 0 },
        currency_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE }
    }, { tableName: 'deposit_products', timestamps: false });
};
