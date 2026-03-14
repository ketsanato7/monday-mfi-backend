module.exports = (sequelize, DataTypes) => {
    return sequelize.define('allowance_types', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        code: { type: DataTypes.STRING(50), allowNull: false },
        name_la: { type: DataTypes.STRING(255), allowNull: false },
        name_en: { type: DataTypes.STRING(255) },
        default_amount: { type: DataTypes.DECIMAL(18,2) },
        is_taxable: { type: DataTypes.BOOLEAN },
        applies_to: { type: DataTypes.STRING(50) },
        is_active: { type: DataTypes.BOOLEAN },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'allowance_types', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
