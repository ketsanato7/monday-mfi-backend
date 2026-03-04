module.exports = (sequelize, DataTypes) => {
    return sequelize.define('employee_positions', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        position_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'employee_positions', createdAt: 'created_at', updatedAt: 'updated_at' });
};
