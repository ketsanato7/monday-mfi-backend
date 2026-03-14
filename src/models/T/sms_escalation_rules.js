module.exports = (sequelize, DataTypes) => {
    return sequelize.define('sms_escalation_rules', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        rule_name: { type: DataTypes.STRING(100), allowNull: false },
        dpd_trigger: { type: DataTypes.INTEGER, allowNull: false },
        channel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SMS' },
        message_template: { type: DataTypes.TEXT, allowNull: false },
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
    }, { tableName: 'sms_escalation_rules', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
