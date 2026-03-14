module.exports = (sequelize, DataTypes) => {
    return sequelize.define('interest_configs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        loan_product_id: { type: DataTypes.INTEGER },
        method_id: { type: DataTypes.INTEGER },
        annual_rate: { type: DataTypes.DECIMAL(10, 4) },
        compounding_frequency: { type: DataTypes.STRING(20), defaultValue: 'monthly' },
        day_count_convention: { type: DataTypes.STRING(20), defaultValue: '30/360' },
        grace_period_days: { type: DataTypes.INTEGER, defaultValue: 0 },
        penalty_rate: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        min_rate: { type: DataTypes.DECIMAL(10, 4) },
        max_rate: { type: DataTypes.DECIMAL(10, 4) },
        org_code: { type: DataTypes.STRING(255) },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'interest_configs', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
