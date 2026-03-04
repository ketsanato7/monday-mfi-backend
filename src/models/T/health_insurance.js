module.exports = (sequelize, DataTypes) => {
    return sequelize.define('health_insurance', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER },
        insurance_no: { type: DataTypes.STRING(100) },
        provider: { type: DataTypes.STRING(255) },
        start_date: { type: DataTypes.DATEONLY },
        end_date: { type: DataTypes.DATEONLY },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'health_insurance', createdAt: 'created_at', updatedAt: 'updated_at' });
};
