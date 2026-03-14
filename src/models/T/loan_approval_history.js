module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_approval_history', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        contract_id: { type: DataTypes.BIGINT, allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        action: { type: DataTypes.STRING(50), allowNull: false },
        from_status: { type: DataTypes.STRING(50) },
        to_status: { type: DataTypes.STRING(50), allowNull: false },
        comments: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'loan_approval_history', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
