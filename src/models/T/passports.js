module.exports = (sequelize, DataTypes) => {
    return sequelize.define('passports', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        passport_no: { type: DataTypes.STRING(1000), allowNull: false },
        passport_name: { type: DataTypes.STRING(1000), allowNull: false },
        exp_date: { type: DataTypes.DATEONLY, allowNull: false },
        person_id: { type: DataTypes.INTEGER, allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE },
        file_url: { type: DataTypes.TEXT }
    }, { tableName: 'passports', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
