module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enterprise_stakeholder_roles', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        role_name_la: { type: DataTypes.STRING(100) },
        role_name_en: { type: DataTypes.STRING(100) }
    }, { tableName: 'enterprise_stakeholder_roles', timestamps: false });
};
