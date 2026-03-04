module.exports = (sequelize, DataTypes) => {
    return sequelize.define('role_menus', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        role_id: { type: DataTypes.INTEGER, allowNull: false },
        menu_item_id: { type: DataTypes.INTEGER, allowNull: false },
        is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { tableName: 'role_menus', createdAt: 'created_at', updatedAt: 'updated_at' });
};
