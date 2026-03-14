module.exports = (sequelize, DataTypes) => {
    return sequelize.define('iif_individual_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
        branch_id: { type: DataTypes.STRING(50) },
        group_id: { type: DataTypes.STRING(50) },
        head_of_group: { type: DataTypes.BOOLEAN, defaultValue: false },
        familybook_province_code: { type: DataTypes.STRING(10) },
        old_surname_en: { type: DataTypes.STRING(255) },
        old_surname_la: { type: DataTypes.STRING(255) },
        spouse_firstname_en: { type: DataTypes.STRING(255) },
        spouse_secondname_en: { type: DataTypes.STRING(255) },
        spouse_lastname_en: { type: DataTypes.STRING(255) },
        spouse_firstname_la: { type: DataTypes.STRING(255) },
        spouse_lastname_la: { type: DataTypes.STRING(255) },
        updated_at: { type: DataTypes.DATE },
        lcic_customer_id: { type: DataTypes.STRING(50) },
        created_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'iif_individual_details', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
