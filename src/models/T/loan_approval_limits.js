module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_approval_limits', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        role_id: { type: DataTypes.INTEGER, allowNull: false },
        max_amount: { type: DataTypes.DECIMAL(20, 2), allowNull: false },
        currency_code: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'LAK' },
        description: { type: DataTypes.TEXT },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'loan_approval_limits', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
