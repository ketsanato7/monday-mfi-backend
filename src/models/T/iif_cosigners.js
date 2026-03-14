module.exports = (sequelize, DataTypes) => {
    return sequelize.define('iif_cosigners', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        loan_id: { type: DataTypes.BIGINT, allowNull: false },
        person_id: { type: DataTypes.BIGINT },
        enterprise_id: { type: DataTypes.INTEGER },
        cosigner_type: { type: DataTypes.STRING(20) },
        updated_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'iif_cosigners', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
