module.exports = (sequelize, DataTypes) => {
    return sequelize.define('iif_headers', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        bank_code: { type: DataTypes.STRING(255), allowNull: false },
        submission_period: { type: DataTypes.STRING(7), allowNull: false },
        total_a_records: { type: DataTypes.INTEGER, defaultValue: 0 },
        total_b_records: { type: DataTypes.INTEGER, defaultValue: 0 },
        total_c_records: { type: DataTypes.INTEGER, defaultValue: 0 },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'iif_headers', createdAt: 'created_at', updatedAt: 'updated_at' });
};
