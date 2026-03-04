module.exports = (sequelize, DataTypes) => {
    return sequelize.define('personal_surname_history', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        person_id: { type: DataTypes.INTEGER },
        old_surname_la: { type: DataTypes.STRING(255) },
        old_surname_en: { type: DataTypes.STRING(255) },
        change_date: { type: DataTypes.DATEONLY },
        remarks: { type: DataTypes.TEXT }
    }, { tableName: 'personal_surname_history', timestamps: false });
};
