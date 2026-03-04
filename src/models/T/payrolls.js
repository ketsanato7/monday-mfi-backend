module.exports = (sequelize, DataTypes) => {
    return sequelize.define('payrolls', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER },
        payroll_month: { type: DataTypes.DATEONLY, allowNull: false },
        basic_salary: { type: DataTypes.DECIMAL(14, 2) },
        allowance: { type: DataTypes.DECIMAL(14, 2) },
        ot: { type: DataTypes.DECIMAL(14, 2) },
        bonus: { type: DataTypes.DECIMAL(14, 2) },
        deduction: { type: DataTypes.DECIMAL(14, 2) },
        social_security: { type: DataTypes.DECIMAL(14, 2) },
        tax: { type: DataTypes.DECIMAL(14, 2) },
        net_salary: { type: DataTypes.DECIMAL(14, 2) },
        pay_date: { type: DataTypes.DATEONLY },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'payrolls', createdAt: 'created_at', updatedAt: 'updated_at' });
};
