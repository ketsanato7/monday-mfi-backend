/**
 * loan_classifications — ຈັດຊັ້ນສິນເຊື່ອ (BoL 184: A/B/C/D/E)
 * ✅ LCIC/BOL: ເພີ່ມ value_en
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_classifications', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        value_en: { type: DataTypes.STRING(255) },           // LCIC/BOL bilingual (ເພີ່ມໃໝ່)
        code: { type: DataTypes.STRING(100) },                // A/B/C/D/E
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_classifications', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
