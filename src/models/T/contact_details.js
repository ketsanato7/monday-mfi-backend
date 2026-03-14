module.exports = (sequelize, DataTypes) => {
    return sequelize.define('contact_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER },
        contact_type: { type: DataTypes.STRING(50) },
        contact_value: { type: DataTypes.STRING(255), allowNull: false },
        is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
        enterprise_id: { type: DataTypes.INTEGER },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'contact_details', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
