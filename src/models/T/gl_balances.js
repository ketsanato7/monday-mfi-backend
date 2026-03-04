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
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE }
    }, { tableName: 'gl_balances', createdAt: 'created_at', updatedAt: 'updated_at' });
};
