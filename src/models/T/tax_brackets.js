module.exports = (sequelize, DataTypes) => {
    return sequelize.define('tax_brackets', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        min_income: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        max_income: { type: DataTypes.DECIMAL(18,2) },
        rate: { type: DataTypes.DECIMAL(6,4), allowNull: false },
        effective_date: { type: DataTypes.DATEONLY, allowNull: false },
        description: { type: DataTypes.STRING(255) },
        is_active: { type: DataTypes.BOOLEAN },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'tax_brackets', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
