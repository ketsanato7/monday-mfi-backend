module.exports = (sequelize, DataTypes) => {
    return sequelize.define('addresses', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER },
        house_no: { type: DataTypes.STRING(100) },
        unit: { type: DataTypes.STRING(100) },
        village_id: { type: DataTypes.INTEGER },
        address_type: { type: DataTypes.STRING(50) },
        created_at: { type: DataTypes.DATE },
        enterprise_id: { type: DataTypes.INTEGER }
    }, { tableName: 'addresses', timestamps: false });
};
