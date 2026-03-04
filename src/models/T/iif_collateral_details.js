module.exports = (sequelize, DataTypes) => {
    return sequelize.define('iif_collateral_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        collateral_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
        branch_id: { type: DataTypes.STRING(50) },
        currency_code: { type: DataTypes.STRING(255), defaultValue: 'LAK' },
        status_code: { type: DataTypes.STRING(10) },
        land_unit_code: { type: DataTypes.STRING(10) },
        land_map_code: { type: DataTypes.STRING(100) },
        street_en: { type: DataTypes.STRING(255) },
        street_la: { type: DataTypes.STRING(255) },
        account_no: { type: DataTypes.STRING(100) },
        account_type_code: { type: DataTypes.STRING(10) },
        machine_type: { type: DataTypes.STRING(100) },
        machine_no: { type: DataTypes.STRING(100) },
        ministry_name: { type: DataTypes.STRING(255) },
        project_number: { type: DataTypes.STRING(100) },
        plate_number: { type: DataTypes.STRING(50) },
        engine_number: { type: DataTypes.STRING(100) },
        body_number: { type: DataTypes.STRING(100) },
        vehicle_model: { type: DataTypes.STRING(100) },
        guarantor_person_id: { type: DataTypes.BIGINT },
        guarantor_enterprise_id: { type: DataTypes.INTEGER },
        weight_unit: { type: DataTypes.STRING(50) },
        updated_at: { type: DataTypes.DATE },
        created_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'iif_collateral_details', createdAt: 'created_at', updatedAt: 'updated_at' });
};
