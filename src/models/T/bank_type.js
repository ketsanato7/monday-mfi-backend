/**
 * bank_type — ປະເພດທະນາຄານ
 * ✅ BOL: code
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('bank_type', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255) },
        code: { type: DataTypes.STRING(20) },                            // BOL bank type code
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'bank_type', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
