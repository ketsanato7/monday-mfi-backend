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
        updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { tableName: 'menu_items', createdAt: 'created_at', updatedAt: 'updated_at' });
};
