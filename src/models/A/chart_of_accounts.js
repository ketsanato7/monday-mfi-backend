module.exports = (sequelize, DataTypes) => {
    return sequelize.define('chart_of_accounts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
        account_name_la: { type: DataTypes.STRING(255), allowNull: false },
        account_name_en: { type: DataTypes.STRING(255) },
        coa_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'ENTERPRISE' },
        account_type: { type: DataTypes.STRING(50), allowNull: false },
        level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        parent_account_id: { type: DataTypes.INTEGER },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        currency_code: { type: DataTypes.STRING(10), defaultValue: 'LAK' },
        description: { type: DataTypes.TEXT },
        account_name_lo: { type: DataTypes.STRING(255) },
        category_id: { type: DataTypes.INTEGER },
        parent_code: { type: DataTypes.STRING(20) },
        is_header: { type: DataTypes.BOOLEAN, defaultValue: false },
        org_code: { type: DataTypes.STRING(255) }
    }, { tableName: 'chart_of_accounts', timestamps: false });
};
