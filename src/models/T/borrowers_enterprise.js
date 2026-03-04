module.exports = (sequelize, DataTypes) => {
    return sequelize.define('borrowers_enterprise', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        enterprise_id: { type: DataTypes.INTEGER, allowNull: false },
        loan_id: { type: DataTypes.INTEGER, allowNull: false }
    }, { tableName: 'borrowers_enterprise', timestamps: false });
};
