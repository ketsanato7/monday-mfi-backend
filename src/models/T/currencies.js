module.exports = (sequelize, DataTypes) => {
    return sequelize.define('currencies', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(3), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(100) },
        symbol: { type: DataTypes.STRING(10) }
    }, { tableName: 'currencies', timestamps: false });
};
