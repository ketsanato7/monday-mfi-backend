module.exports = (sequelize, DataTypes) => {
    const BorrowersIndividual = sequelize.define('borrowers_individual', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        borrower_id: { type: DataTypes.INTEGER, allowNull: false },
        loan_id: { type: DataTypes.INTEGER },
        personal_info_id: { type: DataTypes.INTEGER },
        firstname__l_a: { type: DataTypes.STRING(255) },
        lastname__l_a: { type: DataTypes.STRING(255) },
        firstname__e_n: { type: DataTypes.STRING(255) },
        lastname__e_n: { type: DataTypes.STRING(255) },
        dateofbirth: { type: DataTypes.DATEONLY },
        gender_id: { type: DataTypes.INTEGER },
        nationality_id: { type: DataTypes.INTEGER },
        marital_status_id: { type: DataTypes.INTEGER },
        career_id: { type: DataTypes.INTEGER },
        village_id: { type: DataTypes.INTEGER },
        home_address: { type: DataTypes.STRING(255) },
        contact_info: { type: DataTypes.STRING(255) },
        mobile_no: { type: DataTypes.STRING(255) },
        telephone_no: { type: DataTypes.STRING(255) },
        country_id: { type: DataTypes.INTEGER },
        card_id: { type: DataTypes.INTEGER },
        card_no: { type: DataTypes.STRING(255) },
        card_name: { type: DataTypes.STRING(255) },
        card_date_of_issue: { type: DataTypes.DATEONLY },
        card_exp_date: { type: DataTypes.DATEONLY },
        spouse_id: { type: DataTypes.INTEGER },
        spouse_name_1st__e_n: { type: DataTypes.STRING(255) },
        spouse_surname__e_n: { type: DataTypes.STRING(255) },
        spouse_name__l_a: { type: DataTypes.STRING(255) },
        spouse_surname__l_a: { type: DataTypes.STRING(255) },
        spouse_mobile_no: { type: DataTypes.STRING(255) },
        book_id: { type: DataTypes.INTEGER },
        book_no: { type: DataTypes.STRING(255) },
        book_name: { type: DataTypes.STRING(255) },
        book_date_of_issue: { type: DataTypes.DATEONLY },
        book_village_id: { type: DataTypes.INTEGER },
        passport_id: { type: DataTypes.INTEGER },
        passport_no: { type: DataTypes.STRING(255) },
        passport_name: { type: DataTypes.STRING(255) },
        passport_exp_date: { type: DataTypes.DATEONLY },
        firstname_la: { type: DataTypes.STRING(255) },
        lastname_la: { type: DataTypes.STRING(255) },
        firstname_en: { type: DataTypes.STRING(255) },
        lastname_en: { type: DataTypes.STRING(255) },
        spouse_name_1st_en: { type: DataTypes.STRING(255) },
        spouse_surname_en: { type: DataTypes.STRING(255) },
        spouse_name_la: { type: DataTypes.STRING(255) },
        spouse_surname_la: { type: DataTypes.STRING(255) },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'borrowers_individual', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    BorrowersIndividual.associate = (models) => {
        BorrowersIndividual.belongsTo(models.personal_info, { foreignKey: 'personal_info_id', as: 'personalInfo' });
        BorrowersIndividual.belongsTo(models.genders, { foreignKey: 'gender_id', as: 'gender' });
        BorrowersIndividual.belongsTo(models.nationality, { foreignKey: 'nationality_id', as: 'nationality' });
        BorrowersIndividual.belongsTo(models.careers, { foreignKey: 'career_id', as: 'career' });
        BorrowersIndividual.belongsTo(models.villages, { foreignKey: 'village_id', as: 'village' });
        BorrowersIndividual.belongsTo(models.lao_id_cards, { foreignKey: 'card_id', as: 'idCard' });
        BorrowersIndividual.belongsTo(models.passports, { foreignKey: 'passport_id', as: 'passport' });
        BorrowersIndividual.belongsTo(models.family_books, { foreignKey: 'book_id', as: 'familyBook' });
    };

    return BorrowersIndividual;
};
