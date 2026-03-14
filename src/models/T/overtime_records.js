module.exports = (sequelize, DataTypes) => {
    return sequelize.define('overtime_records', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        employee_id: { type: DataTypes.INTEGER },
        work_date: { type: DataTypes.DATEONLY, allowNull: false },
        start_time: { type: DataTypes.TIME, allowNull: false },
        end_time: { type: DataTypes.TIME, allowNull: false },
        hours: { type: DataTypes.DECIMAL(5,2), allowNull: false },
        ot_type: { type: DataTypes.STRING(30), allowNull: false },
        rate_multiplier: { type: DataTypes.DECIMAL(5,2) },
        amount: { type: DataTypes.DECIMAL(18,2) },
        reason: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(30) },
        approved_by: { type: DataTypes.INTEGER },
        approved_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'overtime_records', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
