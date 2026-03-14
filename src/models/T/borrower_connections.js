/**
 * borrower_connections — ການເຊື່ອມໂຍງຜູ້ກູ້
 * ✅ LCIC/BOL: ເພີ່ມ value_en, code, description ສຳລັບ bilingual reporting
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('borrower_connections', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        // ═══ LCIC/BOL bilingual (ເພີ່ມໃໝ່) ═══
        value_en: { type: DataTypes.STRING(255) },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'borrower_connections', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
