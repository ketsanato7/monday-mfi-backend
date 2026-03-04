module.exports = (sequelize, DataTypes) => {
    return sequelize.define('personal_info', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dateofbirth: { type: DataTypes.DATEONLY },
        gender_id: { type: DataTypes.INTEGER, allowNull: false },
        marital_status_id: { type: DataTypes.INTEGER, allowNull: false },
        career_id: { type: DataTypes.INTEGER, allowNull: false },
        village_id: { type: DataTypes.INTEGER, allowNull: false },
        age: { type: DataTypes.INTEGER },
        firstname__la: { type: DataTypes.STRING(255), allowNull: false },
        lastname__la: { type: DataTypes.STRING(255), allowNull: false },
        firstname__en: { type: DataTypes.STRING(255) },
        lastname__en: { type: DataTypes.STRING(255) },
        nationality_id: { type: DataTypes.INTEGER, allowNull: false },
        home_address: { type: DataTypes.STRING(255) },
        contact_info: { type: DataTypes.STRING(255) },
        personal_code: { type: DataTypes.STRING(255) },
        phone_number: { type: DataTypes.STRING(255) },
        spouse_firstname: { type: DataTypes.STRING(255) },
        spouse_lastname: { type: DataTypes.STRING(255) },
        spouse_career_id: { type: DataTypes.INTEGER },
        spouse_mobile_number: { type: DataTypes.STRING(255) },
        total_family_members: { type: DataTypes.INTEGER },
        females: { type: DataTypes.INTEGER },
        mobile_no: { type: DataTypes.STRING(255) },
        telephone_no: { type: DataTypes.STRING(255) }
    }, { tableName: 'personal_info', timestamps: false });
};
