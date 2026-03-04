module.exports = (sequelize, DataTypes) => {
    return sequelize.define('careers', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
        value_en: { type: DataTypes.STRING(255) },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT }
    }, { tableName: 'careers', createdAt: 'created_at', updatedAt: 'updated_at' });
};
