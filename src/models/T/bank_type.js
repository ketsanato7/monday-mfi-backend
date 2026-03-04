module.exports = (sequelize, DataTypes) => {
    return sequelize.define('bank_type', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'bank_type', createdAt: 'created_at', updatedAt: 'updated_at' });
};
