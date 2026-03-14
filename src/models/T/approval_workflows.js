/**
 * Approval Workflows Model — Maker-Checker
 * BoL Decree 184: 2-level approval for critical operations
 */
module.exports = (sequelize, DataTypes) => {
    const ApprovalWorkflows = sequelize.define('approval_workflows', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        tenant_id: { type: DataTypes.INTEGER },
        entity_type: { type: DataTypes.STRING(50), allowNull: false },   // 'loan_disbursement', 'transfer', 'account_freeze'
        entity_id: { type: DataTypes.INTEGER, allowNull: false },
        // Workflow
        requested_by: { type: DataTypes.INTEGER },
        approved_by: { type: DataTypes.INTEGER },
        status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
        from_status: { type: DataTypes.STRING(50) },
        to_status: { type: DataTypes.STRING(50) },
        // Details
        amount: { type: DataTypes.DECIMAL(20, 4) },
        notes: { type: DataTypes.TEXT },
        rejection_reason: { type: DataTypes.TEXT },
        // Approval chain
        approval_level: { type: DataTypes.INTEGER, defaultValue: 1 },
        required_level: { type: DataTypes.INTEGER, defaultValue: 2 },
        // Audit
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE },
    }, {
        tableName: 'approval_workflows',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: true,
        deletedAt: 'deleted_at'
    });

    ApprovalWorkflows.associate = (models) => {
        ApprovalWorkflows.belongsTo(models.users, { foreignKey: 'requested_by', as: 'requester' });
        ApprovalWorkflows.belongsTo(models.users, { foreignKey: 'approved_by', as: 'approver' });
    };

    return ApprovalWorkflows;
};
