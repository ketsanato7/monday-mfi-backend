module.exports = (sequelize, DataTypes) => {
    return sequelize.define('org_branches', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        org_code: { type: DataTypes.STRING(255), allowNull: false },
        address: { type: DataTypes.STRING(255) },
        phone_number: { type: DataTypes.STRING(255) },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'org_branches', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
