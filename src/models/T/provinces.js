module.exports = (sequelize, DataTypes) => {
    return sequelize.define('provinces', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(100), allowNull: false },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        value_en: { type: DataTypes.STRING(255) },
        status: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'ACTIVE' },
        country_id: { type: DataTypes.INTEGER }
    }, { tableName: 'provinces', timestamps: false });
};
