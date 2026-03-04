module.exports = (sequelize, DataTypes) => {
    return sequelize.define('employee_branch_assignments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER, allowNull: false },
        mfi_branch_id: { type: DataTypes.STRING(255), allowNull: false },
        department_id: { type: DataTypes.INTEGER },
        position_id: { type: DataTypes.INTEGER },
        assigned_date: { type: DataTypes.DATEONLY, allowNull: false },
        end_date: { type: DataTypes.DATEONLY },
        status: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'active' },
        remark: { type: DataTypes.STRING(255) }
    }, { tableName: 'employee_branch_assignments', timestamps: false });
};
