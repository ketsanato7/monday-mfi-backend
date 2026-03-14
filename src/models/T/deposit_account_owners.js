module.exports = (sequelize, DataTypes) => {
    const DepositAccountOwners = sequelize.define('deposit_account_owners', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_id: { type: DataTypes.INTEGER, allowNull: false },
        person_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        enterprise_id: { type: DataTypes.INTEGER },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_account_owners', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    DepositAccountOwners.associate = (models) => {
        DepositAccountOwners.belongsTo(models.deposit_accounts, { foreignKey: 'account_id', as: 'account' });
        DepositAccountOwners.belongsTo(models.personal_info, { foreignKey: 'person_id', as: 'person' });
        DepositAccountOwners.belongsTo(models.enterprise_info, { foreignKey: 'enterprise_id', as: 'enterprise' });
    };

    return DepositAccountOwners;
};
