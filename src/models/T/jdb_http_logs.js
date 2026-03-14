module.exports = (sequelize, DataTypes) => {
    return sequelize.define('jdb_http_logs', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        method: { type: DataTypes.STRING(10), allowNull: false },
        endpoint: { type: DataTypes.TEXT, allowNull: false },
        requestHeaders: { type: DataTypes.TEXT },
        requestBody: { type: DataTypes.TEXT },
        responseStatus: { type: DataTypes.INTEGER },
        responseHeaders: { type: DataTypes.TEXT },
        responseBody: { type: DataTypes.TEXT },
        duration: { type: DataTypes.INTEGER },
        errorMessage: { type: DataTypes.TEXT },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        // ═══ Audit Trail (AML/CFT ມ.22) ═══
        created_by: { type: DataTypes.INTEGER },
        updated_by: { type: DataTypes.INTEGER },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'jdb_http_logs', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};
