module.exports = (sequelize, DataTypes) => {
    return sequelize.define('contact_details', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER },
        contact_type: { type: DataTypes.STRING(50) },
        contact_value: { type: DataTypes.STRING(255), allowNull: false },
        is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
        enterprise_id: { type: DataTypes.INTEGER }
    }, { tableName: 'contact_details', timestamps: false });
};
