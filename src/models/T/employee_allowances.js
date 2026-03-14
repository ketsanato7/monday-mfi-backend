module.exports = (sequelize, DataTypes) => {
    return sequelize.define('employee_allowances', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        employee_id: { type: DataTypes.INTEGER },
        allowance_type_id: { type: DataTypes.INTEGER },
        amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        effective_date: { type: DataTypes.DATEONLY },
        end_date: { type: DataTypes.DATEONLY },
        is_active: { type: DataTypes.BOOLEAN },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'employee_allowances', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
