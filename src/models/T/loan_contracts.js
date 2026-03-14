/**
 * loan_contracts — ສັນຍາເງິນກູ້
 * ✅ BOL/LCIC compliant: branch_id, service_unit_id
 */
module.exports = (sequelize, DataTypes) => {
    const LoanContracts = sequelize.define('loan_contracts', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        contract_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        product_id: { type: DataTypes.INTEGER },
        currency_id: { type: DataTypes.INTEGER },
        approved_amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        term_months: { type: DataTypes.INTEGER, allowNull: false },
        disbursement_date: { type: DataTypes.DATEONLY },
        maturity_date: { type: DataTypes.DATEONLY },
        loan_purpose_id: { type: DataTypes.INTEGER },
        loan_status: { type: DataTypes.STRING(20), defaultValue: 'PENDING' },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        classification_id: { type: DataTypes.INTEGER },
        classification_date: { type: DataTypes.DATEONLY },
        economic_sector_id: { type: DataTypes.INTEGER },
        economic_branch_id: { type: DataTypes.INTEGER },
        borrower_type_id: { type: DataTypes.INTEGER },
        borrower_connection_id: { type: DataTypes.INTEGER },
        funding_source_id: { type: DataTypes.INTEGER },
        remaining_balance: { type: DataTypes.DECIMAL(20, 2) },
        days_past_due: { type: DataTypes.INTEGER, defaultValue: 0 },
        loan_type_id: { type: DataTypes.INTEGER },
        loan_term_id: { type: DataTypes.INTEGER },
        use_of_loan: { type: DataTypes.TEXT },
        allowance_losses: { type: DataTypes.DECIMAL(20, 2) },
        restructured_date: { type: DataTypes.DATEONLY },
        write_off_date: { type: DataTypes.DATEONLY },
        extension_date: { type: DataTypes.DATEONLY },
        funding_org: { type: DataTypes.STRING(1000) },
        // ═══ BOL/LCIC Compliant Fields ═══
        branch_id: { type: DataTypes.STRING(50) },                      // FK → mfi_branches_info.id (ສາຂາທີ່ປ່ອຍກູ້)
        service_unit_id: { type: DataTypes.STRING(50) },                 // FK → mfi_service_units_info.id (ໜ່ວຍບໍລິການ)
        officer_id: { type: DataTypes.INTEGER },                         // FK → employees.id (ພະນັກງານສິນເຊື່ອ)
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_contracts', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    LoanContracts.associate = (models) => {
        LoanContracts.belongsTo(models.loan_products, { foreignKey: 'product_id', as: 'product' });
        LoanContracts.belongsTo(models.currencies, { foreignKey: 'currency_id', as: 'currency' });
        LoanContracts.belongsTo(models.loan_purpose, { foreignKey: 'loan_purpose_id', as: 'loanPurpose' });
        LoanContracts.belongsTo(models.loan_classifications, { foreignKey: 'classification_id', as: 'classification' });
        LoanContracts.belongsTo(models.economic_sectors, { foreignKey: 'economic_sector_id', as: 'economicSector' });
        LoanContracts.belongsTo(models.loan_types, { foreignKey: 'loan_type_id', as: 'loanType' });
        LoanContracts.belongsTo(models.loan_terms, { foreignKey: 'loan_term_id', as: 'loanTerm' });
        LoanContracts.belongsTo(models.employees, { foreignKey: 'officer_id', as: 'officer' });
        LoanContracts.belongsTo(models.mfi_branches_info, { foreignKey: 'branch_id', as: 'branch' });
        LoanContracts.hasMany(models.loan_repayment_schedules, { foreignKey: 'contract_id', as: 'schedules' });
        LoanContracts.hasMany(models.loan_transactions, { foreignKey: 'contract_id', as: 'transactions' });
        LoanContracts.hasMany(models.loan_collaterals, { foreignKey: 'loan_id', as: 'collaterals' });
    };

    return LoanContracts;
};
