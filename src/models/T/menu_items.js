module.exports = (sequelize, DataTypes) => {
    return sequelize.define('menu_items', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        segment: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        title: { type: DataTypes.STRING(255), allowNull: false },
        parent_segment: { type: DataTypes.STRING(255) },
        icon: { type: DataTypes.STRING(100) },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'menu_items', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
