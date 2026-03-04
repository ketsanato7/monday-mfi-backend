module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_types', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(250) },
        value_en: { type: DataTypes.STRING(250) },
        code: { type: DataTypes.STRING(250) },
        description: { type: DataTypes.STRING },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
        status: { type: DataTypes.STRING(50), defaultValue: 'ACTIVE' }
    }, { tableName: 'loan_types', createdAt: 'created_at', updatedAt: 'updated_at' });
};
