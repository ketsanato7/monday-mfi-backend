module.exports = (sequelize, DataTypes) => {
    return sequelize.define('staff_compliance', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER },
        kyc_training_date: { type: DataTypes.DATEONLY },
        aml_training_date: { type: DataTypes.DATEONLY },
        risk_training_date: { type: DataTypes.DATEONLY },
        background_check: { type: DataTypes.BOOLEAN, defaultValue: false },
        disciplinary_record: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'staff_compliance', createdAt: 'created_at', updatedAt: 'updated_at' });
};
