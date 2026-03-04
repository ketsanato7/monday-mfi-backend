module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_purpose', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING },
        value_en: { type: DataTypes.STRING },
        code: { type: DataTypes.STRING },
        description: { type: DataTypes.STRING },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_purpose', createdAt: 'created_at', updatedAt: 'updated_at' });
};
