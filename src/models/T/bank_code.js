module.exports = (sequelize, DataTypes) => {
    return sequelize.define('bank_code', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        bank_code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        bank: { type: DataTypes.STRING(255) },
        name_e: { type: DataTypes.STRING(255) },
        name_l: { type: DataTypes.STRING(255) },
        bank_type_id: { type: DataTypes.INTEGER }
    }, { tableName: 'bank_code', timestamps: false });
};
