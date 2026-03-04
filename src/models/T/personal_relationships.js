module.exports = (sequelize, DataTypes) => {
    return sequelize.define('personal_relationships', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER },
        relative_id: { type: DataTypes.INTEGER },
        relationship_type: { type: DataTypes.STRING(50) },
        is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_at: { type: DataTypes.DATE }
    }, { tableName: 'personal_relationships', timestamps: false });
};
