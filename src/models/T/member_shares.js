module.exports = (sequelize, DataTypes) => {
    return sequelize.define('member_shares', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        member_type_id: { type: DataTypes.INTEGER, allowNull: false },
        from_date: { type: DataTypes.DATEONLY, allowNull: false },
        to_date: { type: DataTypes.DATEONLY, allowNull: false },
        initial_contribution: { type: DataTypes.STRING(1000), allowNull: false },
        contribution: { type: DataTypes.STRING(1000), allowNull: false },
        withdrawal: { type: DataTypes.STRING(1000), allowNull: false },
        remaining_balance: { type: DataTypes.STRING(1000), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'member_shares', createdAt: 'created_at', updatedAt: 'updated_at' });
};
