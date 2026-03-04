module.exports = (sequelize, DataTypes) => {
    return sequelize.define('journal_entry_lines', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        journal_entry_id: { type: DataTypes.BIGINT, allowNull: false },
        account_id: { type: DataTypes.INTEGER, allowNull: false },
        description: { type: DataTypes.STRING(255) },
        debit: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
        credit: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        debit_amount_lak: { type: DataTypes.DECIMAL(20, 2) },
        credit_amount_lak: { type: DataTypes.DECIMAL(20, 2) },
        branch_id: { type: DataTypes.STRING(50) }
    }, { tableName: 'journal_entry_lines', createdAt: 'created_at', updatedAt: 'updated_at' });
};
