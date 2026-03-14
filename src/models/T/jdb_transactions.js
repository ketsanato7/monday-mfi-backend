/**
 * jdb_transactions — ບັນທຶກທຸລະກຳ QR Payment
 * ✅ BOL/LCIC compliant: branch_id STRING(50), contract references
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('jdb_transactions', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        requestId: { type: DataTypes.STRING(255), allowNull: false },
        partnerId: { type: DataTypes.STRING(255) },
        billNumber: { type: DataTypes.STRING(255) },
        txnAmount: { type: DataTypes.DECIMAL(18, 2) },
        currency: { type: DataTypes.STRING(255), defaultValue: 'LAK' },
        terminalId: { type: DataTypes.STRING(255) },
        mobileNo: { type: DataTypes.STRING(255) },
        transactionType: { type: DataTypes.STRING(255) },
        status: { type: DataTypes.STRING(255), defaultValue: 'PENDING' },
        apiResponse: { type: DataTypes.TEXT },
        errorMessage: { type: DataTypes.TEXT },
        refNumber: { type: DataTypes.STRING(255) },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
        emv: { type: DataTypes.TEXT },
        deeplink: { type: DataTypes.TEXT },
        // ═══ BOL/LCIC Compliant Fields ═══
        contract_id: { type: DataTypes.BIGINT },                        // FK → loan_contracts.id
        installment_no: { type: DataTypes.INTEGER },                    // ງວດທີ (BOL repayment tracking)
        branch_id: { type: DataTypes.STRING(50) },                      // FK → mfi_branches_info.id (BOL format)
        payment_type: { type: DataTypes.STRING(10), defaultValue: 'R' },// R=ຄ່າງວດ, F=ຄ່າທຳນຽມ, P=ຄ່າປັບ, O=ອື່ນ
        bank_config_id: { type: DataTypes.INTEGER },                    // FK → bank_api_configs.id
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'jdb_transactions', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
