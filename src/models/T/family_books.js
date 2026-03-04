module.exports = (sequelize, DataTypes) => {
    return sequelize.define('family_books', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        book_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
        province_id: { type: DataTypes.INTEGER },
        issue_date: { type: DataTypes.DATEONLY },
        person_id: { type: DataTypes.INTEGER },
        created_at: { type: DataTypes.DATE },
        book_name: { type: DataTypes.STRING(1000) },
        file_url: { type: DataTypes.TEXT },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'family_books', createdAt: 'created_at', updatedAt: 'updated_at' });
};
