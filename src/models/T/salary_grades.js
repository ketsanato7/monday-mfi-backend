module.exports = (sequelize, DataTypes) => {
    return sequelize.define('salary_grades', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        grade_code: { type: DataTypes.STRING(20), allowNull: false },
        step: { type: DataTypes.INTEGER },
        base_salary: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        description: { type: DataTypes.STRING(255) },
        employee_type: { type: DataTypes.STRING(50), allowNull: false },
        is_active: { type: DataTypes.BOOLEAN },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'salary_grades', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
