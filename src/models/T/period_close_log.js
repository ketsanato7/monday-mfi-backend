module.exports = (sequelize, DataTypes) => {
    return sequelize.define('period_close_log', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        fiscal_period_id: { type: DataTypes.INTEGER, allowNull: false },
        closed_by: { type: DataTypes.INTEGER },
        closed_at: { type: DataTypes.DATE },
        action: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'close' },
        notes: { type: DataTypes.TEXT },
        org_code: { type: DataTypes.STRING(255) }
    }, { tableName: 'period_close_log', timestamps: false });
};
