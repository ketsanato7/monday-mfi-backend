module.exports = (sequelize, DataTypes) => {
    return sequelize.define('deposit_risk_scores', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        account_id: { type: DataTypes.INTEGER },
        person_id: { type: DataTypes.INTEGER },
        enterprise_id: { type: DataTypes.INTEGER },
        nationality_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        occupation_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        amount_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        pep_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        kyc_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        total_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        risk_level: { type: DataTypes.STRING(20), defaultValue: 'LOW' },
        pep_match: { type: DataTypes.BOOLEAN, defaultValue: false },
        pep_details: { type: DataTypes.TEXT },
        scored_by: { type: DataTypes.INTEGER },
        scored_at: { type: DataTypes.DATE },
        org_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'deposit_risk_scores', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
