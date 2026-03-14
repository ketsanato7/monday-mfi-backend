module.exports = (sequelize, DataTypes) => {
    return sequelize.define('audit_logs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        action: { type: DataTypes.STRING(255), allowNull: false },
        table_name: { type: DataTypes.STRING(255), allowNull: false },
        record_id: { type: DataTypes.STRING(255) },
        old_values: { type: DataTypes.JSONB },
        new_values: { type: DataTypes.JSONB },
        ip_address: { type: DataTypes.STRING(255) },
        user_agent: { type: DataTypes.TEXT },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE, allowNull: false },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'audit_logs', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
