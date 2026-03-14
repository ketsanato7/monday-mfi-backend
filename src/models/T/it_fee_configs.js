module.exports = (sequelize, DataTypes) => {
    return sequelize.define('it_fee_configs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        fee_type: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        fee_name: { type: DataTypes.STRING(255), allowNull: false },
        calc_method: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'FIXED' },
        rate: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        fixed_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        min_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        max_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'it_fee_configs', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
