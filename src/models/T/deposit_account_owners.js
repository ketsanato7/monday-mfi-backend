module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_account_owners', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_id: { type: DataTypes.INTEGER, allowNull: false },
        person_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        enterprise_id: { type: DataTypes.INTEGER }
    }, { tableName: 'deposit_account_owners', timestamps: false });
};
