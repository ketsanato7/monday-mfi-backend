module.exports = (sequelize, DataTypes) => {
    return sequelize.define('mfi_branch_service_units', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        mfi_branch_id: { type: DataTypes.STRING(100), allowNull: false },
        service_unit_id: { type: DataTypes.STRING(100), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'mfi_branch_service_units', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
