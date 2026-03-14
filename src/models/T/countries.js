module.exports = (sequelize, DataTypes) => {
    return sequelize.define('countries', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        en_short: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
        en_formal: { type: DataTypes.STRING(500) },
        cn_short: { type: DataTypes.STRING(500) },
        cn_formal: { type: DataTypes.STRING(1000) },
        value: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
        value_en: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        status: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'ACTIVE' },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'countries', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
