module.exports = (sequelize, DataTypes) => {
    return sequelize.define('mfi_service_units_info', {
        id: { type: DataTypes.STRING(255), primaryKey: true },
        approved_date: { type: DataTypes.DATEONLY, allowNull: false },
        name__l_a: { type: DataTypes.STRING(255), allowNull: false },
        name__e_n: { type: DataTypes.STRING(255), allowNull: false },
        village_id: { type: DataTypes.INTEGER, allowNull: false },
        address: { type: DataTypes.STRING(255), allowNull: false },
        house_unit: { type: DataTypes.STRING(255), allowNull: false },
        house_no: { type: DataTypes.STRING(255), allowNull: false },
        license_no: { type: DataTypes.STRING(255), allowNull: false },
        employees: { type: DataTypes.INTEGER, allowNull: false },
        employees_female: { type: DataTypes.INTEGER, allowNull: false },
        tel: { type: DataTypes.STRING(255), allowNull: false },
        mobile: { type: DataTypes.STRING(255), allowNull: false },
        fax: { type: DataTypes.STRING(255), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: false },
        whatsapp: { type: DataTypes.STRING(255), allowNull: false },
        website: { type: DataTypes.STRING(255), allowNull: false },
        other_infos: { type: DataTypes.STRING(255), allowNull: false },
        latitude: { type: DataTypes.STRING(255), allowNull: false },
        longitude: { type: DataTypes.STRING(255), allowNull: false },
        mfi_info_id: { type: DataTypes.INTEGER },
        mfi_branches_info_id: { type: DataTypes.INTEGER },
        service_units: { type: DataTypes.STRING(255) },
        branches: { type: DataTypes.STRING(255) }
    }, { tableName: 'mfi_service_units_info', timestamps: false });
};
