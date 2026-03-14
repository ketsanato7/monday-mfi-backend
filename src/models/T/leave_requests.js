module.exports = (sequelize, DataTypes) => {
    return sequelize.define('leave_requests', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        employee_id: { type: DataTypes.INTEGER },
        leave_type_id: { type: DataTypes.INTEGER },
        start_date: { type: DataTypes.DATEONLY, allowNull: false },
        end_date: { type: DataTypes.DATEONLY, allowNull: false },
        total_days: { type: DataTypes.DECIMAL(5,1), allowNull: false },
        reason: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(30) },
        approved_by: { type: DataTypes.INTEGER },
        approved_at: { type: DataTypes.DATE },
        reject_reason: { type: DataTypes.TEXT },
        attachment_url: { type: DataTypes.STRING(500) },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'leave_requests', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
