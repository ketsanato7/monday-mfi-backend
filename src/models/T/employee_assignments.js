module.exports = (sequelize, DataTypes) => {
    return sequelize.define('employee_assignments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        employee_id: { type: DataTypes.INTEGER, allowNull: false },
        mfi_id: { type: DataTypes.INTEGER },
        branch_id: { type: DataTypes.STRING(100) },
        service_unit_id: { type: DataTypes.STRING(100) },
        department_id: { type: DataTypes.INTEGER },
        start_date: { type: DataTypes.DATEONLY, allowNull: false },
        end_date: { type: DataTypes.DATEONLY },
        is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'employee_assignments', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
