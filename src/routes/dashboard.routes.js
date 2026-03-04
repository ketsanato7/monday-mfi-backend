const express = require('express');
const router = express.Router();
const db = require('../models/index');
const { QueryTypes } = require('sequelize');

router.get('/dashboard/summary', async (req, res) => {
    try {
        // 1. ຍອດປ່ອຍກູ້ (Total Loan Amount) - sum of approved_amount from loan_contracts
        const [loanResult] = await db.sequelize.query(`
            SELECT COALESCE(SUM(approved_amount), 0) as total_loan,
                   COUNT(*) as loan_count
            FROM loan_contracts
            WHERE loan_status NOT IN ('DRAFT', 'CANCELLED')
        `, { type: QueryTypes.SELECT });

        // 2. ຍອດເງິນຝາກ (Total Deposits) - count from deposit_accounts
        const [depositResult] = await db.sequelize.query(`
            SELECT COUNT(*) as deposit_count
            FROM deposit_accounts
        `, { type: QueryTypes.SELECT });

        // 3. ຈຳນວນລູກຄ້າ (Total Borrowers)
        const [borrowerResult] = await db.sequelize.query(`
            SELECT COUNT(*) as borrower_count
            FROM borrowers_individual
        `, { type: QueryTypes.SELECT });

        const totalLoan = Number(loanResult?.total_loan || 0);
        const loanCount = Number(loanResult?.loan_count || 0);
        const depositCount = Number(depositResult?.deposit_count || 0);
        const borrowerCount = Number(borrowerResult?.borrower_count || 0);

        res.json({
            success: true,
            data: {
                total_loan: totalLoan,
                loan_count: loanCount,
                total_deposit: depositCount,
                total_cash: borrowerCount,
            }
        });
    } catch (error) {
        console.error('Dashboard API Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
