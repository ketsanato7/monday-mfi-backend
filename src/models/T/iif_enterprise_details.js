module.exports = (sequelize, DataTypes) => {
    return sequelize.define('iif_enterprise_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        enterprise_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        branch_id: { type: DataTypes.STRING(50) },
        group_id: { type: DataTypes.STRING(50) },
        head_of_group: { type: DataTypes.BOOLEAN, defaultValue: false },
        tax_no: { type: DataTypes.STRING(100) },
        category_code: { type: DataTypes.STRING(50) },
        shareholder_gender: { type: DataTypes.STRING(255) },
        shareholder_firstname_en: { type: DataTypes.STRING(255) },
        shareholder_secondname_en: { type: DataTypes.STRING(255) },
        shareholder_lastname_en: { type: DataTypes.STRING(255) },
        shareholder_firstname_la: { type: DataTypes.STRING(255) },
        shareholder_lastname_la: { type: DataTypes.STRING(255) },
        gm_gender: { type: DataTypes.STRING(255) },
        gm_firstname_en: { type: DataTypes.STRING(255) },
        gm_secondname_en: { type: DataTypes.STRING(255) },
        gm_lastname_en: { type: DataTypes.STRING(255) },
        gm_firstname_la: { type: DataTypes.STRING(255) },
        gm_lastname_la: { type: DataTypes.STRING(255) },
        regulatory_capital: { type: DataTypes.DECIMAL(20, 2) },
        currency_code: { type: DataTypes.STRING(255), defaultValue: 'LAK' },
        updated_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'iif_enterprise_details', createdAt: 'created_at', updatedAt: 'updated_at' });
};
