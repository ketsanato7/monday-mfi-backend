module.exports = (sequelize, DataTypes) => {
    return sequelize.define('account_categories', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
        name_lo: { type: DataTypes.STRING(255), allowNull: false },
        name_en: { type: DataTypes.STRING(255), allowNull: false },
        normal_balance: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'debit' },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 }
    }, { tableName: 'account_categories', timestamps: false });
};
