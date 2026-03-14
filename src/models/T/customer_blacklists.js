module.exports = (sequelize, DataTypes) => {
    return sequelize.define('customer_blacklists', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        customer_id: { type: DataTypes.INTEGER, allowNull: false },
        customer_type: { type: DataTypes.STRING(255), allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: false },
        blacklisted_by: { type: DataTypes.INTEGER, allowNull: false },
        blacklisted_date: { type: DataTypes.DATEONLY, allowNull: false },
        removed_date: { type: DataTypes.DATEONLY },
        removed_by: { type: DataTypes.INTEGER },
        is_active: { type: DataTypes.BOOLEAN },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'customer_blacklists', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
