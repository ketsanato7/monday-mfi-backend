module.exports = (sequelize, DataTypes) => {
    return sequelize.define('collateral_enterprises', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        enterprise_id: { type: DataTypes.INTEGER, allowNull: false },
        collateral_id: { type: DataTypes.BIGINT, allowNull: false },    // FK → collaterals.id (BIGINT)
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'collateral_enterprises', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
