module.exports = (sequelize, DataTypes) => {
    return sequelize.define('leave_balances', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        employee_id: { type: DataTypes.INTEGER },
        leave_type_id: { type: DataTypes.INTEGER },
        year: { type: DataTypes.INTEGER, allowNull: false },
        entitled_days: { type: DataTypes.DECIMAL(5,1), allowNull: false },
        used_days: { type: DataTypes.DECIMAL(5,1) },
        carried_over: { type: DataTypes.DECIMAL(5,1) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'leave_balances', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
