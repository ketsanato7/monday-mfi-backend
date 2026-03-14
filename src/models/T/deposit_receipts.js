module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_receipts', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_id: { type: DataTypes.INTEGER },
        receipt_no: { type: DataTypes.STRING(50), unique: true },
        receipt_type: { type: DataTypes.STRING(30), defaultValue: 'OPENING' },
        amount: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        printed_by: { type: DataTypes.INTEGER },
        printed_at: { type: DataTypes.DATE },
        pdf_url: { type: DataTypes.TEXT },
        org_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_receipts', createdAt: 'created_at', updatedAt: false, paranoid: true, deletedAt: 'deleted_at' });
};
