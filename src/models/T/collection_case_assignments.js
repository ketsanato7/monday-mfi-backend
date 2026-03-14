module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collection_case_assignments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        contract_id: { type: DataTypes.INTEGER, allowNull: false },
        officer_id: { type: DataTypes.INTEGER, allowNull: false },
        assigned_date: { type: DataTypes.DATEONLY },
        dpd_bucket: { type: DataTypes.STRING(30), allowNull: false },
        priority: { type: DataTypes.STRING(20) },
        status: { type: DataTypes.STRING(30) },
        resolved_date: { type: DataTypes.DATEONLY },
        resolution_notes: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'collection_case_assignments', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
