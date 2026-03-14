module.exports = (sequelize, DataTypes) => {
    return sequelize.define('period_close_log', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        fiscal_period_id: { type: DataTypes.INTEGER, allowNull: false },
        closed_by: { type: DataTypes.INTEGER },
        closed_at: { type: DataTypes.DATE },
        action: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'close' },
        notes: { type: DataTypes.TEXT },
        org_code: { type: DataTypes.STRING(255) },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'period_close_log', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
