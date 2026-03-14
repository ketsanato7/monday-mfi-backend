module.exports = (sequelize, DataTypes) => {
    return sequelize.define('fiscal_periods', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        period_name: { type: DataTypes.STRING(50), allowNull: false },
        period_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'month' },
        start_date: { type: DataTypes.DATEONLY, allowNull: false },
        end_date: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
        org_code: { type: DataTypes.STRING(255) },
        closed_by: { type: DataTypes.INTEGER },
        closed_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'fiscal_periods', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
