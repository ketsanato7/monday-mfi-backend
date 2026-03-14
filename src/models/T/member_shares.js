/**
 * member_shares — ຮຸ້ນສະມາຊິກ
 * ✅ BOL: DECIMAL money fields + branch_id
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('member_shares', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        member_type_id: { type: DataTypes.INTEGER, allowNull: false },
        from_date: { type: DataTypes.DATEONLY, allowNull: false },
        to_date: { type: DataTypes.DATEONLY, allowNull: false },
        initial_contribution: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },   // ✅ STRING→DECIMAL
        contribution: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },            // ✅ STRING→DECIMAL
        withdrawal: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },              // ✅ STRING→DECIMAL
        remaining_balance: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },       // ✅ STRING→DECIMAL
        // ═══ BOL ═══
        branch_id: { type: DataTypes.STRING(50) },                       // FK → mfi_branches_info.id
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'member_shares', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
