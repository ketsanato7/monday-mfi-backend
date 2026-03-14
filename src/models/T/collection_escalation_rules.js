module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collection_escalation_rules', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        rule_name: { type: DataTypes.STRING(100), allowNull: false },
        dpd_min: { type: DataTypes.INTEGER, allowNull: false },
        dpd_max: { type: DataTypes.INTEGER, allowNull: false },
        action_type: { type: DataTypes.STRING(50), allowNull: false },
        action_label: { type: DataTypes.STRING(100), allowNull: false },
        next_action_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        org_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'collection_escalation_rules', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
