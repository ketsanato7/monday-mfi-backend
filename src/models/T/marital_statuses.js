/**
 * marital_statuses — ສະຖານະພາບ
 * ✅ LCIC/BOL: ເພີ່ມ value_en (S/M/D/W/P/F/O mapping)
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('marital_statuses', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(100), allowNull: false },
        value_en: { type: DataTypes.STRING(255) },           // LCIC/BOL bilingual (ເພີ່ມໃໝ່)
        code: { type: DataTypes.STRING(100) },                // S/M/D/W/P/F/O
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'marital_statuses', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
