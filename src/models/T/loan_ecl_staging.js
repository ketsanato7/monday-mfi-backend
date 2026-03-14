module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_ecl_staging', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        loan_id: { type: DataTypes.BIGINT, allowNull: false },
        assessment_date: { type: DataTypes.DATEONLY, allowNull: false },
        stage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        days_past_due: { type: DataTypes.INTEGER, defaultValue: 0 },
        probability_of_default: { type: DataTypes.DECIMAL(10, 6), defaultValue: 0 },
        loss_given_default: { type: DataTypes.DECIMAL(10, 6), defaultValue: 0 },
        exposure_at_default: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        ecl_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        previous_stage: { type: DataTypes.INTEGER },
        org_code: { type: DataTypes.STRING(255) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'loan_ecl_staging', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
