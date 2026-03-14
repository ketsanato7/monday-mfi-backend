module.exports = (sequelize, DataTypes) => {
    const Provinces = sequelize.define('provinces', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        value: { type: DataTypes.STRING(100), allowNull: false },
        code: { type: DataTypes.STRING(100) },
        description: { type: DataTypes.TEXT },
        value_en: { type: DataTypes.STRING(255) },
        status: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'ACTIVE' },
        country_id: { type: DataTypes.INTEGER },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'provinces', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });

    Provinces.associate = (models) => {
        Provinces.hasMany(models.districts, { foreignKey: 'province_id', as: 'districts' });
    };

    return Provinces;
};
