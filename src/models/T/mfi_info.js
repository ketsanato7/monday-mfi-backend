module.exports = (sequelize, DataTypes) => {
    return sequelize.define('mfi_info', {
        id: { type: DataTypes.STRING(255), primaryKey: true },
        approved_date: { type: DataTypes.DATEONLY, allowNull: false },
        name__l_a: { type: DataTypes.STRING(255), allowNull: false },
        name__e_n: { type: DataTypes.STRING(255), allowNull: false },
        village_id: { type: DataTypes.INTEGER, allowNull: false },
        address: { type: DataTypes.STRING(255), allowNull: false },
        house_unit: { type: DataTypes.STRING(255), allowNull: false },
        house_no: { type: DataTypes.STRING(255), allowNull: false },
        license_no: { type: DataTypes.STRING(255), allowNull: false },
        branches: { type: DataTypes.INTEGER, allowNull: false },
        service_units: { type: DataTypes.INTEGER, allowNull: false },
        employees: { type: DataTypes.INTEGER, allowNull: false },
        employees_female: { type: DataTypes.INTEGER, allowNull: false },
        employees__h_q: { type: DataTypes.INTEGER, allowNull: false },
        employees_female__h_q: { type: DataTypes.INTEGER, allowNull: false },
        tel: { type: DataTypes.STRING(255), allowNull: false },
        mobile: { type: DataTypes.STRING(255), allowNull: false },
        fax: { type: DataTypes.STRING(255), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: false },
        whatsapp: { type: DataTypes.STRING(255), allowNull: false },
        website: { type: DataTypes.STRING(255), allowNull: false },
        other_info: { type: DataTypes.STRING(255), allowNull: false },
        latitude: { type: DataTypes.STRING(255), allowNull: false },
        longitude: { type: DataTypes.STRING(255), allowNull: false },
        enterprise_info_id: { type: DataTypes.INTEGER },
        other_infos: { type: DataTypes.STRING(255) },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'mfi_info', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
