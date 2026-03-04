module.exports = (sequelize, DataTypes) => {
    return sequelize.define('v_borrower_loans', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        loan_id: { type: DataTypes.BIGINT },
        person_id: { type: DataTypes.INTEGER },
        account_number: { type: DataTypes.STRING(50) },
        from_date: { type: DataTypes.DATEONLY },
        to_date: { type: DataTypes.DATEONLY },
        approved_balance: { type: DataTypes.DECIMAL(20, 2) },
        remaining_balance: { type: DataTypes.DECIMAL(20, 2) },
        interest_rate: { type: DataTypes.DECIMAL(5, 2) },
        loan_status: { type: DataTypes.STRING(20) },
        currency_code: { type: DataTypes.STRING(10) },
        days_past_due: { type: DataTypes.INTEGER },
        classification: { type: DataTypes.STRING(500) },
        category: { type: DataTypes.STRING(500) },
        economic_sector: { type: DataTypes.STRING(500) },
        economic_branch: { type: DataTypes.STRING(500) },
        funding_source: { type: DataTypes.STRING(500) },
        use_of_loan: { type: DataTypes.TEXT },
        created_at: { type: DataTypes.DATE }
    }, { tableName: 'v_borrower_loans', timestamps: false });
};
