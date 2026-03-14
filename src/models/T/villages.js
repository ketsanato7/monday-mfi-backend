/**
 * villages — ບ້ານ
 * ✅ BOL: code + bilingual (IIF reporting)
 */
module.exports = (sequelize, DataTypes) => {
    const Villages = sequelize.define('villages', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        value_en: { type: DataTypes.STRING(255) },                       // English name (IIF)
        district_id: { type: DataTypes.INTEGER, allowNull: false },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'villages', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    Villages.associate = (models) => {
        Villages.belongsTo(models.districts, { foreignKey: 'district_id', as: 'district' });
    };

    return Villages;
};
