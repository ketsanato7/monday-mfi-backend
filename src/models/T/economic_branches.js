module.exports = (sequelize, DataTypes) => {
    return sequelize.define('economic_branches', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'economic_branches', createdAt: 'created_at', updatedAt: 'updated_at' });
};
