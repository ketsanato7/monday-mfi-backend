module.exports = (sequelize, DataTypes) => {
    return sequelize.define('trial_balance', {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        account_no: { type: DataTypes.STRING(255) },
        account_title: { type: DataTypes.STRING(255) },
        trial_balance_debit: { type: DataTypes.STRING(255) },
        trial_balance_credit: { type: DataTypes.STRING(255) },
        adjustment_debit: { type: DataTypes.STRING(255) },
        adjustment_credit: { type: DataTypes.STRING(255) },
        adjusted_trial_balance_debit: { type: DataTypes.STRING(255) },
        adjusted_trial_balance_credit: { type: DataTypes.STRING(255) }
    }, { tableName: 'trial_balance', timestamps: false });
};
