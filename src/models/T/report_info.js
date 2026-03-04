module.exports = (sequelize, DataTypes) => {
    return sequelize.define('report_info', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        mfi_id: { type: DataTypes.STRING(255) },
        report_date: { type: DataTypes.DATEONLY },
        account_closing_date: { type: DataTypes.DATEONLY },
        phone: { type: DataTypes.STRING(255) },
        email: { type: DataTypes.STRING(255) },
        whatsapp: { type: DataTypes.STRING(255) }
    }, { tableName: 'report_info', timestamps: false });
};
