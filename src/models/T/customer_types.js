/**
 * customer_types — ປະເພດລູກຄ້າ
 * ✅ BOL: code
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('customer_types', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(1000), allowNull: false },
        value_en: { type: DataTypes.STRING(255) },                       // English name
        code: { type: DataTypes.STRING(10) },                            // BOL code
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'customer_types', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
