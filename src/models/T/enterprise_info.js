module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_info', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name__e_n: { type: DataTypes.STRING(255), allowNull: false },
        register_no: { type: DataTypes.STRING(255), allowNull: false },
        date_of_issue: { type: DataTypes.DATEONLY },
        registrant: { type: DataTypes.STRING(255), allowNull: false },
        enterprise_size_id: { type: DataTypes.INTEGER },
        village_id: { type: DataTypes.INTEGER },
        name__l_a: { type: DataTypes.STRING(255), allowNull: false },
        tax_no: { type: DataTypes.STRING(255) },
        mobile_no: { type: DataTypes.STRING(255) },
        telephone_no: { type: DataTypes.STRING(255) },
        registration_place_issue: { type: DataTypes.STRING(255) },
        regulatory_capital: { type: DataTypes.DECIMAL(18, 2) },
        currency_id: { type: DataTypes.INTEGER },
        enterprise_type_id: { type: DataTypes.INTEGER },
        enterprise_model_detail_id: { type: DataTypes.INTEGER }
    }, { tableName: 'enterprise_info', timestamps: false });
};
