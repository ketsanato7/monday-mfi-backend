module.exports = (sequelize, DataTypes) => {
    return sequelize.define('audit_trail', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        table_name: { type: DataTypes.STRING(100) },
        record_id: { type: DataTypes.INTEGER },
        action: { type: DataTypes.STRING(30) },
        old_data: { type: DataTypes.JSONB },
        new_data: { type: DataTypes.JSONB },
        changed_fields: { type: DataTypes.JSONB },
        user_id: { type: DataTypes.INTEGER },
        ip_address: { type: DataTypes.STRING(45) },
        user_agent: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        org_id: { type: DataTypes.INTEGER },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'audit_trail', createdAt: 'created_at', updatedAt: false, paranoid: true, deletedAt: 'deleted_at' });
};
