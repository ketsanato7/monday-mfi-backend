module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collateral_individuals', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER, allowNull: false },
        collateral_id: { type: DataTypes.BIGINT, allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'collateral_individuals', createdAt: 'created_at', updatedAt: 'updated_at' });
};
