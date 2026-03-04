module.exports = (sequelize, DataTypes) => {
    return sequelize.define('individual_groups', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        group_name: { type: DataTypes.STRING(255), allowNull: false },
        village_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE }
    }, { tableName: 'individual_groups', timestamps: false });
};
