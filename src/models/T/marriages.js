module.exports = (sequelize, DataTypes) => {
    return sequelize.define('marriages', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        spouse_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        marriage_date: { type: DataTypes.DATEONLY, allowNull: false },
        divorce_date: { type: DataTypes.DATEONLY },
        is_current: { type: DataTypes.BOOLEAN, defaultValue: true },
        note: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'marriages', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
