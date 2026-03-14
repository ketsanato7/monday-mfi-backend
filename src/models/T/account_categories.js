module.exports = (sequelize, DataTypes) => {
    return sequelize.define('account_categories', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
        name_lo: { type: DataTypes.STRING(255), allowNull: false },
        name_en: { type: DataTypes.STRING(255), allowNull: false },
        normal_balance: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'debit' },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'account_categories', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
