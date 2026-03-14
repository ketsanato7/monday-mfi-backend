/**
 * economic_sectors — ຂະແໜງເສດຖະກິດ
 * ✅ BOL: code (ລະຫັດ ທຫລ ກຳນົດ) + bilingual
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('economic_sectors', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        value_en: { type: DataTypes.STRING(255) },                       // English name
        code: { type: DataTypes.STRING(20) },                            // BOL sector code
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'economic_sectors', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
