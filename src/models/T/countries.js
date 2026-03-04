module.exports = (sequelize, DataTypes) => {
    return sequelize.define('countries', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        en_short: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
        en_formal: { type: DataTypes.STRING(500) },
        cn_short: { type: DataTypes.STRING(500) },
        cn_formal: { type: DataTypes.STRING(1000) },
        value: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
        value_en: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'ACTIVE' }
    }, { tableName: 'countries', timestamps: false });
};
