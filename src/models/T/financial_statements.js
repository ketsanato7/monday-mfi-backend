module.exports = (sequelize, DataTypes) => {
    return sequelize.define('financial_statements', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        statement_type: { type: DataTypes.STRING(50), allowNull: false },
        fiscal_period_id: { type: DataTypes.INTEGER, allowNull: false },
        generated_at: { type: DataTypes.DATE },
        generated_by: { type: DataTypes.INTEGER },
        org_code: { type: DataTypes.STRING(255) },
        branch_id: { type: DataTypes.STRING(50) },
        status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE }
    }, { tableName: 'financial_statements', createdAt: 'created_at', updatedAt: 'updated_at' });
};
