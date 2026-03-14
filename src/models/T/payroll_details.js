module.exports = (sequelize, DataTypes) => {
    return sequelize.define('payroll_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        payroll_id: { type: DataTypes.INTEGER },
        item_type: { type: DataTypes.STRING(50), allowNull: false },
        item_code: { type: DataTypes.STRING(50), allowNull: false },
        item_name: { type: DataTypes.STRING(255) },
        amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        note: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'payroll_details', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
