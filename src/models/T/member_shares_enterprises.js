module.exports = (sequelize, DataTypes) => {
    return sequelize.define('member_shares_enterprises', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        member_shares_id: { type: DataTypes.INTEGER, allowNull: false },
        enterprise_id: { type: DataTypes.INTEGER, allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'member_shares_enterprises', createdAt: 'created_at', updatedAt: 'updated_at' });
};
