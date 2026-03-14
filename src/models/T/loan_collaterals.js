module.exports = (sequelize, DataTypes) => {
    const LoanCollaterals = sequelize.define('loan_collaterals', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        collateral_id: { type: DataTypes.BIGINT, allowNull: false },
        loan_id: { type: DataTypes.BIGINT, allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_collaterals', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    LoanCollaterals.associate = (models) => {
        LoanCollaterals.belongsTo(models.collaterals, { foreignKey: 'collateral_id', as: 'collateral' });
    };

    return LoanCollaterals;
};
