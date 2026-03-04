module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_models', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING },
        value_en: { type: DataTypes.STRING },
        code: { type: DataTypes.STRING },
        status: { type: DataTypes.STRING },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'enterprise_models', createdAt: 'created_at', updatedAt: 'updated_at' });
};
