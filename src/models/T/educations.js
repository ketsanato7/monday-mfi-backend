module.exports = (sequelize, DataTypes) => {
    return sequelize.define('educations', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(1000), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'educations', createdAt: 'created_at', updatedAt: 'updated_at' });
};
