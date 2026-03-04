module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_model_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true },
        value: { type: DataTypes.STRING },
        value_en: { type: DataTypes.STRING },
        code: { type: DataTypes.STRING },
        status: { type: DataTypes.STRING },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
        enterprise_model_id: { type: DataTypes.INTEGER }
    }, { tableName: 'enterprise_model_details', createdAt: 'created_at', updatedAt: 'updated_at' });
};
