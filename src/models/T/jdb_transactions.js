module.exports = (sequelize, DataTypes) => {
    return sequelize.define('jdb_transactions', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        requestId: { type: DataTypes.STRING(255), allowNull: false },
        partnerId: { type: DataTypes.STRING(255) },
        billNumber: { type: DataTypes.STRING(255) },
        txnAmount: { type: DataTypes.DECIMAL(18, 2) },
        currency: { type: DataTypes.STRING(255), defaultValue: 'LAK' },
        terminalId: { type: DataTypes.STRING(255) },
        mobileNo: { type: DataTypes.STRING(255) },
        transactionType: { type: DataTypes.STRING(255) },
        status: { type: DataTypes.STRING(255), defaultValue: 'PENDING' },
        apiResponse: { type: DataTypes.TEXT },
        errorMessage: { type: DataTypes.TEXT },
        refNumber: { type: DataTypes.STRING(255) },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
        emv: { type: DataTypes.TEXT },
        deeplink: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'jdb_transactions', createdAt: 'created_at', updatedAt: 'updated_at' });
};
