module.exports = (sequelize, DataTypes) => {
    return sequelize.define('loan_insurance', {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        loan_id: { type: DataTypes.BIGINT },
        insurance_type: { type: DataTypes.STRING(255), allowNull: false },
        premium: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
        coverage_amount: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
        start_date: { type: DataTypes.DATEONLY },
        end_date: { type: DataTypes.DATEONLY },
        beneficiary: { type: DataTypes.STRING(500) },
        notes: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
        deleted_at: { type: DataTypes.DATE }
    }, { tableName: 'loan_insurance', createdAt: 'created_at', updatedAt: 'updated_at' });
};
