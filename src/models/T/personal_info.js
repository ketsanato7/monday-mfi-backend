/**
 * personal_info — ຂໍ້ມູນບຸກຄົນ
 * ✅ BOL/LCIC: education_id ສຳລັບລາຍງານ
 */
module.exports = (sequelize, DataTypes) => {
    const PersonalInfo = sequelize.define('personal_info', {
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
        telephone_no: { type: DataTypes.STRING(255) },
        // ═══ BOL/LCIC ═══
        education_id: { type: DataTypes.INTEGER },                       // FK → educations.id (LCIC ຕ້ອງການ)
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'personal_info', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    PersonalInfo.associate = (models) => {
        PersonalInfo.belongsTo(models.genders, { foreignKey: 'gender_id', as: 'gender' });
        PersonalInfo.belongsTo(models.marital_statuses, { foreignKey: 'marital_status_id', as: 'maritalStatus' });
        PersonalInfo.belongsTo(models.careers, { foreignKey: 'career_id', as: 'career' });
        PersonalInfo.belongsTo(models.villages, { foreignKey: 'village_id', as: 'village' });
        PersonalInfo.belongsTo(models.nationality, { foreignKey: 'nationality_id', as: 'nationality' });
        PersonalInfo.belongsTo(models.educations, { foreignKey: 'education_id', as: 'education' });
        PersonalInfo.hasMany(models.borrowers_individual, { foreignKey: 'personal_info_id', as: 'borrowerRecords' });
        PersonalInfo.hasMany(models.loan_applications, { foreignKey: 'personal_info_id', as: 'loanApplications' });
        PersonalInfo.hasMany(models.deposit_account_owners, { foreignKey: 'person_id', as: 'depositAccounts' });
    };

    return PersonalInfo;
};
