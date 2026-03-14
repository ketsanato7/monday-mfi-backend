module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collection_actions', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        contract_id: { type: DataTypes.INTEGER, allowNull: false },
        action_type: { type: DataTypes.STRING(50), allowNull: false },
        action_date: { type: DataTypes.DATE },
        officer_id: { type: DataTypes.INTEGER },
        dpd_at_action: { type: DataTypes.INTEGER },
        contact_result: { type: DataTypes.STRING(100) },
        notes: { type: DataTypes.TEXT },
        next_action_date: { type: DataTypes.DATEONLY },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'collection_actions', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
