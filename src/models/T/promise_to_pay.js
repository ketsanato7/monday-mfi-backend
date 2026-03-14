module.exports = (sequelize, DataTypes) => {
    return sequelize.define('promise_to_pay', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        org_id: { type: DataTypes.INTEGER },
        contract_id: { type: DataTypes.INTEGER, allowNull: false },
        action_id: { type: DataTypes.INTEGER },
        promised_date: { type: DataTypes.DATEONLY, allowNull: false },
        promised_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
        actual_paid_amount: { type: DataTypes.DECIMAL(18,2) },
        actual_paid_date: { type: DataTypes.DATEONLY },
        status: { type: DataTypes.STRING(30) },
        created_by: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'promise_to_pay', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
