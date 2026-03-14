module.exports = (sequelize, DataTypes) => {
    const LoanApplications = sequelize.define('loan_applications', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        application_no: { type: DataTypes.STRING(255), allowNull: false },
        personal_info_id: { type: DataTypes.INTEGER },
        enterprise_info_id: { type: DataTypes.INTEGER },
        loan_product_id: { type: DataTypes.INTEGER, allowNull: false },
        requested_amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        requested_term: { type: DataTypes.INTEGER, allowNull: false },
        purpose: { type: DataTypes.TEXT, allowNull: false },
        monthly_income: { type: DataTypes.DECIMAL(20, 2) },
        monthly_expense: { type: DataTypes.DECIMAL(20, 2) },
        dti_ratio: { type: DataTypes.DECIMAL(5, 2) },
        recommended_amount: { type: DataTypes.DECIMAL(20, 2) },
        recommended_term: { type: DataTypes.INTEGER },
        status: { type: DataTypes.STRING(255) },
        kyc_status: { type: DataTypes.STRING(255) },
        kyc_notes: { type: DataTypes.TEXT },
        assigned_officer_id: { type: DataTypes.INTEGER },
        branch_id: { type: DataTypes.STRING(255) },
        disbursement_method: { type: DataTypes.STRING(255) },
        disbursement_date: { type: DataTypes.DATEONLY },
        contract_no: { type: DataTypes.STRING(255) },
        loan_id: { type: DataTypes.INTEGER },
        notes: { type: DataTypes.TEXT },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
        bank_name: { type: DataTypes.STRING(255) },
        bank_account_no: { type: DataTypes.STRING(255) },
        bank_account_owner: { type: DataTypes.STRING(255) },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'loan_applications', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    LoanApplications.associate = (models) => {
        LoanApplications.belongsTo(models.personal_info, { foreignKey: 'personal_info_id', as: 'personalInfo' });
        LoanApplications.belongsTo(models.enterprise_info, { foreignKey: 'enterprise_info_id', as: 'enterpriseInfo' });
        LoanApplications.belongsTo(models.loan_products, { foreignKey: 'loan_product_id', as: 'loanProduct' });
        LoanApplications.belongsTo(models.employees, { foreignKey: 'assigned_officer_id', as: 'assignedOfficer' });
    };

    return LoanApplications;
};
