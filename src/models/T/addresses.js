module.exports = (sequelize, DataTypes) => {
    return sequelize.define('addresses', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER },
        house_no: { type: DataTypes.STRING(100) },
        unit: { type: DataTypes.STRING(100) },
        village_id: { type: DataTypes.INTEGER },
        address_type: { type: DataTypes.STRING(50) },
        created_at: { type: DataTypes.DATE },
        enterprise_id: { type: DataTypes.INTEGER },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'addresses', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
