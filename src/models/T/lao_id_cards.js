module.exports = (sequelize, DataTypes) => {
    return sequelize.define('lao_id_cards', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        card_no: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        card_name: { type: DataTypes.STRING(500) },
        date_of_issue: { type: DataTypes.DATEONLY },
        exp_date: { type: DataTypes.DATEONLY },
        person_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE },
        file_url: { type: DataTypes.TEXT }
    }, { tableName: 'lao_id_cards', createdAt: 'created_at', updatedAt: 'updated_at' });
};
