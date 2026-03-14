/**
 * nationality — ສັນຊາດ
 * ✅ BOL: code + value (bilingual)
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('nationality', {
        nationality_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(255) },                          // ຊື່ລາວ
        value_en: { type: DataTypes.STRING(255) },                       // ຊື່ English
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'nationality', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
