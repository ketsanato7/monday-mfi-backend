module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_terms', {
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
    }, { tableName: 'loan_terms', createdAt: 'created_at', updatedAt: 'updated_at' });
};
