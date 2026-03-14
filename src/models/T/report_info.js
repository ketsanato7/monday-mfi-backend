module.exports = (sequelize, DataTypes) => {
    return sequelize.define('report_info', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        mfi_id: { type: DataTypes.STRING(255) },
        report_date: { type: DataTypes.DATEONLY },
        account_closing_date: { type: DataTypes.DATEONLY },
        phone: { type: DataTypes.STRING(255) },
        email: { type: DataTypes.STRING(255) },
        whatsapp: { type: DataTypes.STRING(255) },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'report_info', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
