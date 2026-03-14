/**
 * lcic_reports — ປະຫວັດການສົ່ງອອກຂໍ້ມູນ LCIC
 * ✅ LCIC/LICL compliant
 */
module.exports = (sequelize, DataTypes) => {
    const LcicReports = sequelize.define('lcic_reports', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        report_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        report_date: { type: DataTypes.DATEONLY, allowNull: false },
        export_type: { type: DataTypes.STRING(20), defaultValue: 'LICL' }, // LICL, OTHER
        status: { type: DataTypes.STRING(20), defaultValue: 'COMPLETED' },
        file_path: { type: DataTypes.STRING(500) },
        total_records: { type: DataTypes.INTEGER, defaultValue: 0 },
        created_by: { type: DataTypes.INTEGER },
        // ═══ Audit Trail ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { 
        tableName: 'lcic_reports', 
        createdAt: 'created_at', 
        updatedAt: 'updated_at', 
        paranoid: true, 
        deletedAt: 'deleted_at' 
    });

    LcicReports.associate = (models) => {
        LcicReports.belongsTo(models.users, { foreignKey: 'created_by', as: 'creator' });
    };

    return LcicReports;
};
