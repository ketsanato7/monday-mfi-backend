module.exports = (sequelize, DataTypes) => {
    return sequelize.define('amlio_reports', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        report_type: { type: DataTypes.STRING(10), defaultValue: 'CTR' },
        reference_table: { type: DataTypes.STRING(100) },
        reference_id: { type: DataTypes.INTEGER },
        person_id: { type: DataTypes.INTEGER },
        enterprise_id: { type: DataTypes.INTEGER },
        amount: { type: DataTypes.DECIMAL(18, 2) },
        currency_code: { type: DataTypes.STRING(10) },
        risk_level: { type: DataTypes.STRING(20) },
        reason: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(30), defaultValue: 'DRAFT' },
        submitted_by: { type: DataTypes.INTEGER },
        submitted_at: { type: DataTypes.DATE },
        amlio_ref_no: { type: DataTypes.STRING(100) },
        org_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'amlio_reports', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
