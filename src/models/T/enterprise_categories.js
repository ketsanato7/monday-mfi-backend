module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_categories', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(100), allowNull: false },
        value_en: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(10), unique: true },
        description: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(50), defaultValue: 'ACTIVE' }
    }, { tableName: 'enterprise_categories', timestamps: false });
};
