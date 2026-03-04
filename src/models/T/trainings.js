module.exports = (sequelize, DataTypes) => {
    return sequelize.define('trainings', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER },
        course_name: { type: DataTypes.STRING(255) },
        provider: { type: DataTypes.STRING(255) },
        start_date: { type: DataTypes.DATEONLY },
        end_date: { type: DataTypes.DATEONLY },
        certificate_file: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'trainings', createdAt: 'created_at', updatedAt: 'updated_at' });
};
