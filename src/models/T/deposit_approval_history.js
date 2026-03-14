module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_approval_history', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        account_id: { type: DataTypes.INTEGER },
        user_id: { type: DataTypes.INTEGER },
        action: { type: DataTypes.STRING(50) },
        from_status: { type: DataTypes.STRING(50) },
        to_status: { type: DataTypes.STRING(50) },
        comments: { type: DataTypes.TEXT },
        risk_level: { type: DataTypes.STRING(20) },
        created_at: { type: DataTypes.DATE },
        org_id: { type: DataTypes.INTEGER },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_approval_history', createdAt: 'created_at', updatedAt: false, paranoid: true, deletedAt: 'deleted_at' });
};
