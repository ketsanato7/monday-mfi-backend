module.exports = (sequelize, DataTypes) => {
    return sequelize.define('country_risk_levels', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        country_id: { type: DataTypes.INTEGER },
        risk_level: { type: DataTypes.STRING(20), defaultValue: 'LOW' },
        is_fatf_blacklist: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_sanctions: { type: DataTypes.BOOLEAN, defaultValue: false },
        notes: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'country_risk_levels', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
