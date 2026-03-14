/**
 * CTR Reports Model — Currency Transaction Reports
 * AML/CFT Article 20: ທຸລະກຳ ≥100M LAK ຕ້ອງລາຍງານ AMLIO
 */
module.exports = (sequelize, DataTypes) => {
    const CtrReports = sequelize.define('ctr_reports', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tenant_id: { type: DataTypes.INTEGER },
        // ═══ Transaction Reference ═══
        transaction_type: { type: DataTypes.STRING(20) },          // 'loan' | 'deposit' | 'transfer'
        transaction_id: { type: DataTypes.INTEGER },                // FK → source transaction
        transaction_date: { type: DataTypes.DATE },
        // ═══ Amount ═══
        amount: { type: DataTypes.DECIMAL(20, 4), allowNull: false },
        currency_id: { type: DataTypes.INTEGER },                   // FK → currencies
        amount_lak: { type: DataTypes.DECIMAL(20, 4) },            // LAK equivalent for threshold check
        // ═══ Customer Info ═══
        customer_type: { type: DataTypes.STRING(20) },             // 'individual' | 'enterprise'
        customer_id: { type: DataTypes.INTEGER },                   // FK → personal_info or enterprise_info
        customer_name: { type: DataTypes.STRING(255) },
        customer_id_number: { type: DataTypes.STRING(50) },        // ID card / passport / business reg
        // ═══ Report Details ═══
        report_type: { type: DataTypes.STRING(10), defaultValue: 'CTR' }, // 'CTR' | 'STR'
        report_no: { type: DataTypes.STRING(50) },                  // Auto-generated: CTR-2026-001234
        status: { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending | submitted | acknowledged | rejected
        threshold_amount: { type: DataTypes.DECIMAL(20, 4), defaultValue: 100000000 }, // 100M LAK
        // ═══ Submission ═══
        submitted_at: { type: DataTypes.DATE },
        submitted_by: { type: DataTypes.INTEGER },                  // FK → users
        amlio_reference: { type: DataTypes.STRING(100) },          // AMLIO acknowledgement ref
        notes: { type: DataTypes.TEXT },
        // ═══ Branch/Officer ═══
        branch_id: { type: DataTypes.STRING(50) },                 // FK → mfi_branches_info
        officer_id: { type: DataTypes.INTEGER },                    // FK → employees
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE },
    }, {
        tableName: 'ctr_reports',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: true,
        deletedAt: 'deleted_at'
    });

    CtrReports.associate = (models) => {
        CtrReports.belongsTo(models.currencies, { foreignKey: 'currency_id', as: 'currency' });
        CtrReports.belongsTo(models.employees, { foreignKey: 'officer_id', as: 'officer' });
        CtrReports.belongsTo(models.mfi_branches_info, { foreignKey: 'branch_id', as: 'branch' });
    };

    return CtrReports;
};
