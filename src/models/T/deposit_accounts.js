/**
 * deposit_accounts — ບັນຊີເງິນຝາກ
 * ✅ BOL T13: depositor_type_id, deposit_type_id, maturity_date, interest_rate,
 *            opening_balance, deposit_amount, withdrawal_amount, economic_sector_id, economic_branch_id
 * ✅ BOL: branch_id, officer_id
 */
module.exports = (sequelize, DataTypes) => {
    const DepositAccounts = sequelize.define('deposit_accounts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_no: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        product_id: { type: DataTypes.INTEGER },
        currency_id: { type: DataTypes.INTEGER },
        opening_date: { type: DataTypes.DATEONLY },
        account_status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
        current_balance: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        accrued_interest: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        // ═══ BOL T13 (ເພີ່ມໃໝ່ — ບໍ່ກະທົບ columns ເດີມ) ═══
        depositor_type_id: { type: DataTypes.INTEGER },                    // FK → customer_types (D3: ບຸກຄົນ/ນິຕິບຸກຄົນ)
        deposit_type_id: { type: DataTypes.INTEGER },                      // FK → deposit_types (D4: ກະແສ/ປະຢັດ/ປະຈຳ)
        maturity_date: { type: DataTypes.DATEONLY },                        // BoL T13.6 (to_date)
        interest_rate: { type: DataTypes.DECIMAL(8, 4), defaultValue: 0 }, // BoL T13.12
        opening_balance: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 }, // BoL T13.8
        deposit_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },  // BoL T13.10 (0 ຖ້າບໍ່ມີຝາກ)
        withdrawal_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 }, // BoL T13.11 (0 ຖ້າບໍ່ມີຖອນ)
        economic_sector_id: { type: DataTypes.INTEGER },                   // FK → economic_sectors (D6)
        economic_branch_id: { type: DataTypes.INTEGER },                   // FK → economic_branches (D5)
        // ═══ BOL ═══
        branch_id: { type: DataTypes.STRING(50) },                         // FK → mfi_branches_info.id
        officer_id: { type: DataTypes.INTEGER },                           // FK → employees.id
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_accounts', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    DepositAccounts.associate = (models) => {
        DepositAccounts.belongsTo(models.deposit_products, { foreignKey: 'product_id', as: 'product' });
        DepositAccounts.belongsTo(models.currencies, { foreignKey: 'currency_id', as: 'currency' });
        DepositAccounts.belongsTo(models.employees, { foreignKey: 'officer_id', as: 'officer' });
        DepositAccounts.belongsTo(models.mfi_branches_info, { foreignKey: 'branch_id', as: 'branch' });
        DepositAccounts.hasMany(models.deposit_transactions, { foreignKey: 'account_id', as: 'transactions' });
        DepositAccounts.hasMany(models.deposit_account_owners, { foreignKey: 'account_id', as: 'owners' });
        // ═══ BOL T13 associations ═══
        if (models.customer_types) DepositAccounts.belongsTo(models.customer_types, { foreignKey: 'depositor_type_id', as: 'depositorType' });
        if (models.deposit_types) DepositAccounts.belongsTo(models.deposit_types, { foreignKey: 'deposit_type_id', as: 'depositType' });
        if (models.economic_sectors) DepositAccounts.belongsTo(models.economic_sectors, { foreignKey: 'economic_sector_id', as: 'economicSector' });
        if (models.economic_branches) DepositAccounts.belongsTo(models.economic_branches, { foreignKey: 'economic_branch_id', as: 'economicBranch' });
    };

    return DepositAccounts;
};
