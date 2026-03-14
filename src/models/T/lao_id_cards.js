/**
 * lao_id_cards — ບັດປະຊາຊົນ
 * ✅ LCIC: place_of_issue
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('lao_id_cards', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        card_no: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        card_name: { type: DataTypes.STRING(500) },
        date_of_issue: { type: DataTypes.DATEONLY },
        exp_date: { type: DataTypes.DATEONLY },
        person_id: { type: DataTypes.INTEGER },
        // ═══ LCIC ═══
        place_of_issue: { type: DataTypes.STRING(255) },                 // ສະຖານທີ່ອອກບັດ
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE },
        file_url: { type: DataTypes.TEXT }
    }, { tableName: 'lao_id_cards', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
