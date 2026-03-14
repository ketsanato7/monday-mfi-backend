module.exports = (sequelize, DataTypes) => {
    return sequelize.define('ecl_parameters', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        loan_category: { type: DataTypes.STRING(50), allowNull: false },
        stage: { type: DataTypes.INTEGER, allowNull: false },
        pd_rate: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
        lgd_rate: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
        stage_threshold_days: { type: DataTypes.INTEGER, allowNull: false },
        effective_date: { type: DataTypes.DATEONLY, allowNull: false },
        org_code: { type: DataTypes.STRING(255) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'ecl_parameters', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
