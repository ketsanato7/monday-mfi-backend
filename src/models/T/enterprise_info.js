/**
 * enterprise_info — ຂໍ້ມູນວິສາຫະກິດ
 * ✅ BOL: economic_sector_id, economic_branch_id
 */
module.exports = (sequelize, DataTypes) => {
    const EnterpriseInfo = sequelize.define('enterprise_info', {
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
        enterprise_model_detail_id: { type: DataTypes.INTEGER },
        // ═══ BOL/LCIC ═══
        economic_sector_id: { type: DataTypes.INTEGER },                 // FK → economic_sectors (BOL ຈັດຊັ້ນ)
        economic_branch_id: { type: DataTypes.INTEGER },                 // FK → economic_branches (BOL ຈັດຊັ້ນ)
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'enterprise_info', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    EnterpriseInfo.associate = (models) => {
        EnterpriseInfo.hasMany(models.borrowers_enterprise, { foreignKey: 'enterprise_id', as: 'borrowerRecords' });
        EnterpriseInfo.hasMany(models.loan_applications, { foreignKey: 'enterprise_info_id', as: 'loanApplications' });
        EnterpriseInfo.hasMany(models.deposit_account_owners, { foreignKey: 'enterprise_id', as: 'depositAccounts' });
    };

    return EnterpriseInfo;
};
