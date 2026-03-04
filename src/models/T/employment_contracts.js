module.exports = (sequelize, DataTypes) => {
    return sequelize.define('employment_contracts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER },
        contract_type: { type: DataTypes.STRING(100) },
        start_date: { type: DataTypes.DATEONLY },
        end_date: { type: DataTypes.DATEONLY },
        salary: { type: DataTypes.DECIMAL(14, 2) },
        probation_month: { type: DataTypes.INTEGER },
        working_hours: { type: DataTypes.INTEGER },
        signed_date: { type: DataTypes.DATEONLY },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'employment_contracts', createdAt: 'created_at', updatedAt: 'updated_at' });
};
