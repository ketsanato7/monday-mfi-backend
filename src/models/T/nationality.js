module.exports = (sequelize, DataTypes) => {
    return sequelize.define('nationality', {
        nationality_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'nationality', createdAt: 'created_at', updatedAt: 'updated_at' });
};
