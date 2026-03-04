module.exports = (sequelize, DataTypes) => {
    return sequelize.define('employees', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        contact_info: { type: DataTypes.TEXT },
        education_level_id: { type: DataTypes.INTEGER },
        date_of_employment: { type: DataTypes.DATEONLY },
        field_of_study: { type: DataTypes.STRING(1000) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
        employee_code: { type: DataTypes.STRING(50), unique: true },
        hire_date: { type: DataTypes.DATEONLY },
        employment_type: { type: DataTypes.STRING(50) },
        status: { type: DataTypes.STRING(50), defaultValue: 'ACTIVE' }
    }, { tableName: 'employees', createdAt: 'created_at', updatedAt: 'updated_at' });
};
