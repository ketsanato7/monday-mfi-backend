module.exports = (sequelize, DataTypes) => {
    return sequelize.define('mfi_hq_service_units', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        service_unit_id: { type: DataTypes.STRING(100), allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'mfi_hq_service_units', createdAt: 'created_at', updatedAt: 'updated_at' });
};
