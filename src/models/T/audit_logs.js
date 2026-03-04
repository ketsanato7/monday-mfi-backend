module.exports = (sequelize, DataTypes) => {
    return sequelize.define('audit_logs', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER },
        action: { type: DataTypes.STRING(255), allowNull: false },
        table_name: { type: DataTypes.STRING(255), allowNull: false },
        record_id: { type: DataTypes.STRING(255) },
        old_values: { type: DataTypes.JSONB },
        new_values: { type: DataTypes.JSONB },
        ip_address: { type: DataTypes.STRING(255) },
        user_agent: { type: DataTypes.TEXT },
        description: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE, allowNull: false }
    }, { tableName: 'audit_logs', timestamps: false });
};
