module.exports = (sequelize, DataTypes) => {
    return sequelize.define('financial_statement_lines', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        statement_id: { type: DataTypes.INTEGER, allowNull: false },
        line_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        label_lo: { type: DataTypes.STRING(255) },
        label_en: { type: DataTypes.STRING(255) },
        account_code: { type: DataTypes.STRING(20) },
        amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        amount_previous: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        is_header: { type: DataTypes.BOOLEAN, defaultValue: false },
        indent_level: { type: DataTypes.INTEGER, defaultValue: 0 },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'financial_statement_lines', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
