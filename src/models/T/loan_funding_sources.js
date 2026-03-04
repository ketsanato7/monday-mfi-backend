module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_funding_sources', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(500), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_funding_sources', createdAt: 'created_at', updatedAt: 'updated_at' });
};
