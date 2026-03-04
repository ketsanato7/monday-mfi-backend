module.exports = (sequelize, DataTypes) => {
    return sequelize.define('notifications', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        type: { type: DataTypes.STRING(255), allowNull: false },
        title: { type: DataTypes.STRING(255), allowNull: false },
        message: { type: DataTypes.TEXT, allowNull: false },
        entity_type: { type: DataTypes.STRING(255) },
        entity_id: { type: DataTypes.INTEGER },
        is_read: { type: DataTypes.BOOLEAN },
        read_at: { type: DataTypes.DATE },
        channel: { type: DataTypes.STRING(255) },
        sent_at: { type: DataTypes.DATE },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
    }, { tableName: 'notifications' });
};
