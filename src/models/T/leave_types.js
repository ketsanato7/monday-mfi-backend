module.exports = (sequelize, DataTypes) => {
    return sequelize.define('leave_types', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        code: { type: DataTypes.STRING(50), allowNull: false },
        name_la: { type: DataTypes.STRING(255), allowNull: false },
        name_en: { type: DataTypes.STRING(255) },
        max_days_per_year: { type: DataTypes.INTEGER },
        is_paid: { type: DataTypes.BOOLEAN },
        requires_document: { type: DataTypes.BOOLEAN },
        gender_restriction: { type: DataTypes.STRING(20) },
        is_active: { type: DataTypes.BOOLEAN },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'leave_types', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
