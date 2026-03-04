module.exports = (sequelize, DataTypes) => {
    return sequelize.define('journal_entries', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        transaction_date: { type: DataTypes.DATEONLY, allowNull: false },
        reference_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT },
        currency_code: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'LAK' },
        exchange_rate: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1 },
        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
        total_debit: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
        total_credit: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
        branch_id: { type: DataTypes.STRING(100) },
        created_by: { type: DataTypes.INTEGER },
        posted_by: { type: DataTypes.INTEGER },
        posted_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
        org_code: { type: DataTypes.STRING(255) },
        fiscal_period_id: { type: DataTypes.INTEGER },
        source_module: { type: DataTypes.STRING(50) },
        source_id: { type: DataTypes.BIGINT }
    }, { tableName: 'journal_entries', createdAt: 'created_at', updatedAt: 'updated_at' });
};
