/**
 * bank_api_configs — ຕັ້ງຄ່າ API ທະນາຄານ (JDB/BCEL/LDB/APB...)
 * ແຕ່ລະສະຖາບັນ MFI ສາມາດເຊື່ອມຕໍ່ທະນາຄານຕ່າງກັນ
 * ✅ ຕາມມາດຕະຖານ BOL naming (snake_case)
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('bank_api_configs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        bank_code: { type: DataTypes.STRING(20), allowNull: false },           // JDB, BCEL, LDB, APB
        bank_name: { type: DataTypes.STRING(100), allowNull: false },          // ຊື່ສະແດງ
        base_url: { type: DataTypes.STRING(500), allowNull: false },           // API endpoint
        partner_id: { type: DataTypes.STRING(100) },                           // partner ID
        client_id: { type: DataTypes.STRING(100) },                            // client ID
        client_secret: { type: DataTypes.TEXT },                               // 🔒 encrypted
        merchant_id: { type: DataTypes.STRING(100) },                          // merchant ID
        sign_secret: { type: DataTypes.TEXT },                                 // 🔒 encrypted
        callback_url: { type: DataTypes.STRING(500) },                         // URL ຮັບ callback
        is_active: { type: DataTypes.BOOLEAN, defaultValue: false },           // ເປີດ/ປິດ
        mfi_info_id: { type: DataTypes.STRING(255) },                          // FK → mfi_info (BOL format)
        branch_id: { type: DataTypes.STRING(50) },                             // FK → mfi_branches_info (BOL format)
        notes: { type: DataTypes.TEXT },                                       // ໝາຍເຫດ
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'bank_api_configs', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
