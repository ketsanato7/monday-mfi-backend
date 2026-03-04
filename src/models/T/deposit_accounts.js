module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_accounts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_no: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        product_id: { type: DataTypes.INTEGER },
        currency_id: { type: DataTypes.INTEGER },
        opening_date: { type: DataTypes.DATEONLY },
        account_status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
        current_balance: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        accrued_interest: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE }
    }, { tableName: 'deposit_accounts', createdAt: 'created_at', updatedAt: 'updated_at' });
};
