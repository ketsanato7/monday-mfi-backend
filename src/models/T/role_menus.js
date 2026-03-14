module.exports = (sequelize, DataTypes) => {
    const RoleMenus = sequelize.define('role_menus', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        role_id: { type: DataTypes.INTEGER, allowNull: false },
        menu_item_id: { type: DataTypes.INTEGER, allowNull: false },
        is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'role_menus', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    RoleMenus.associate = (models) => {
        RoleMenus.belongsTo(models.roles, { foreignKey: 'role_id', as: 'role' });
        RoleMenus.belongsTo(models.menu_items, { foreignKey: 'menu_id', as: 'menu' });
    };

    return RoleMenus;
};
