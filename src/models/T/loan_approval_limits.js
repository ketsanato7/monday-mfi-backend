module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_approval_limits', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        role_id: { type: DataTypes.INTEGER, allowNull: false },
        max_amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        currency_code: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'LAK' },
        description: { type: DataTypes.TEXT }
    }, { tableName: 'loan_approval_limits', timestamps: false });
};
