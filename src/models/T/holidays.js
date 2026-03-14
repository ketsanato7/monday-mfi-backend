/**
 * holidays — ວັນພັກລັດຖະການ
 * ✅ BOL compliant for interest and repayment calculation
 */
module.exports = (sequelize, DataTypes) => {
    const Holidays = sequelize.define('holidays', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        holiday_date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
        name_la: { type: DataTypes.STRING(255), allowNull: false },
        name_en: { type: DataTypes.STRING(255) },
        is_recurring: { type: DataTypes.BOOLEAN, defaultValue: false },
        description: { type: DataTypes.TEXT },
        // ═══ Audit Trail ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { 
        tableName: 'holidays', 
        createdAt: 'created_at', 
        updatedAt: 'updated_at', 
        paranoid: true, 
        deletedAt: 'deleted_at' 
    });

    return Holidays;
};
