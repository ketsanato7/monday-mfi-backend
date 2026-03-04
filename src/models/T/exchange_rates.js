module.exports = (sequelize, DataTypes) => {
    return sequelize.define('exchange_rates', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        currency_code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
        rate_date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
        buying_rate: { type: DataTypes.DECIMAL(15, 4) },
        selling_rate: { type: DataTypes.DECIMAL(15, 4) },
        mid_rate: { type: DataTypes.DECIMAL(15, 4) },
        source: { type: DataTypes.STRING(50), defaultValue: 'BoL' },
        created_at: { type: DataTypes.DATE }
    }, { tableName: 'exchange_rates', timestamps: false });
};
