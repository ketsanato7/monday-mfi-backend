module.exports = (sequelize, DataTypes) => {
    return sequelize.define('organizations', {
        code: { type: DataTypes.STRING(255), primaryKey: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        business_type: { type: DataTypes.STRING(255) },
        tax_id: { type: DataTypes.STRING(255) },
        address: { type: DataTypes.STRING(255) },
        phone_number: { type: DataTypes.STRING(255) },
        logo_url: { type: DataTypes.STRING(255) },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false }
    }, { tableName: 'organizations' });
};
