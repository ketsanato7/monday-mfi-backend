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
        remark: { type: DataTypes.STRING(255) },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'employee_branch_assignments', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
