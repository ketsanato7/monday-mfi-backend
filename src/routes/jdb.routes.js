/**
 * jdb.routes.js — JDB QR Payment API Routes
 *
 * POST /api/jdb/generate-qr       — ສ້າງ QR ສຳລັບ ປ່ອຍ ເງິນ ກູ້
 * GET  /api/jdb/check/:billNumber — ກວດ ສະ ຖາ ນະ ດ້ວຍ billNumber
 * POST /api/jdb/check-ref         — ກວດ ສະ ຖາ ນະ ດ້ວຍ reference
 * POST /api/jdb/disable-bill      — ຍົກ ເລີກ bill
 * POST /api/jdb/refund            — ຄືນ ເງິນ
 * POST /api/jdb/callback          — JDB callback (webhook)
 * GET  /api/jdb/test-connection   — ທົດ ສອບ ເຊື່ອມ ຕໍ່
 */
const db = require('../models');
const { requirePermission } = require('../middleware/rbac');
const express = require('express');
const router = express.Router();
const jdbService = require('../services/jdb.service');

// ═══════════════════════════════════════════════════════
// POST /jdb/generate-qr
// ສ້າງ QR Code ສຳລັບ ລູກ ຄ້າ ສະ ແກນ ຈ່າຍ
// ═══════════════════════════════════════════════════════
router.post('/jdb/generate-qr', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const { amount, loanId, mobileNo } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: 'ຈຳ ນວນ ເງິນ ບໍ່ ຖືກ ຕ້ອງ',
                status: false,
            });
        }

        // Generate unique bill number: MPAY-LOAN-{loanId}-{timestamp}
        const billNumber = `MPAY${loanId || 0}T${Date.now()}`.slice(0, 25);

        const result = await jdbService.generateQR({
            amount,
            billNumber,
            mobileNo,
        });

        // ═══ Save to jdb_transactions (PENDING) ═══
        try {
            await db.jdb_transactions.create({
                requestId: result.transactionId || billNumber,
                partnerId: 'MPAY',
                billNumber,
                txnAmount: amount,
                currency: 'LAK',
                mobileNo: mobileNo || null,
                transactionType: 'GENERATE_QR',
                status: 'PENDING',
                apiResponse: JSON.stringify(result),
                emv: result.emv,
            });
            console.log(`💾 jdb_transactions saved: ${billNumber} (PENDING)`);
        } catch (dbErr) {
            console.error('⚠️ Failed to save jdb_transactions:', dbErr.message);
        }

        res.json({
            message: 'ສ້າງ QR ສຳ ເລັດ',
            data: result,
            status: true,
        });
    } catch (error) {
        console.error('❌ JDB generate-qr error:', error.message);
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            message: `JDB Error: ${error.response?.data?.message || error.message}`,
            status: false,
        });
    }
});

// ═══════════════════════════════════════════════════════
// GET /jdb/check/:billNumber
// ກວດ ສະ ຖາ ນະ ການ ຈ່າຍ ດ້ວຍ billNumber
// ═══════════════════════════════════════════════════════
router.get('/jdb/check/:billNumber', async (req, res) => {
    try {
        const { billNumber } = req.params;
        const result = await jdbService.checkTransaction(billNumber);

        // Determine payment status
        const isPaid = result.success && result.data?.message === 'SUCCESS';

        res.json({
            message: isPaid ? 'ຈ່າຍ ສຳ ເລັດ' : 'ລໍ ຖ້າ ການ ຈ່າຍ',
            data: result.data || null,
            paid: isPaid,
            jdbResponse: result,
            status: true,
        });
    } catch (error) {
        console.error('❌ JDB check error:', error.message);
        // If JDB returns error, it might mean transaction not found (still pending)
        res.json({
            message: 'ລໍ ຖ້າ ການ ຈ່າຍ',
            paid: false,
            status: true,
            jdbError: error.response?.data?.message || error.message,
        });
    }
});

// ═══════════════════════════════════════════════════════
// POST /jdb/check-ref
// ກວດ ສະ ຖາ ນະ ດ້ວຍ reference number
// ═══════════════════════════════════════════════════════
router.post('/jdb/check-ref', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const { bankCode, reference } = req.body;

        if (!reference) {
            return res.status(400).json({
                message: 'ກະ ລຸ ນາ ລະ ບຸ reference',
                status: false,
            });
        }

        const result = await jdbService.checkTransactionByRef({
            bankCode,
            reference,
        });

        res.json({
            message: 'ກວດ ສອບ ສຳ ເລັດ',
            data: result.data || null,
            jdbResponse: result,
            status: true,
        });
    } catch (error) {
        console.error('❌ JDB check-ref error:', error.message);
        res.status(500).json({
            message: `JDB Error: ${error.response?.data?.message || error.message}`,
            status: false,
        });
    }
});

// ═══════════════════════════════════════════════════════
// POST /jdb/disable-bill
// ຍົກ ເລີກ / ປິດ bill number
// ═══════════════════════════════════════════════════════
router.post('/jdb/disable-bill', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const { billNumber } = req.body;

        if (!billNumber) {
            return res.status(400).json({
                message: 'ກະ ລຸ ນາ ລະ ບຸ billNumber',
                status: false,
            });
        }

        const result = await jdbService.disableBill(billNumber);

        res.json({
            message: 'ຍົກ ເລີ ກ bill ສຳ ເລັດ',
            data: result.data || null,
            status: true,
        });
    } catch (error) {
        console.error('❌ JDB disable-bill error:', error.message);
        res.status(500).json({
            message: `JDB Error: ${error.response?.data?.message || error.message}`,
            status: false,
        });
    }
});

// ═══════════════════════════════════════════════════════
// POST /jdb/refund
// ຄືນ ເງິນ
// ═══════════════════════════════════════════════════════
router.post('/jdb/refund', requirePermission('ເບີກຈ່າຍ'), async (req, res) => {
    try {
        const { txnAmount, billNumber, remark } = req.body;

        if (!billNumber || !txnAmount) {
            return res.status(400).json({
                message: 'ກະ ລຸ ນາ ລະ ບຸ billNumber ແລະ txnAmount',
                status: false,
            });
        }

        const result = await jdbService.refund({ txnAmount, billNumber, remark });

        res.json({
            message: 'ຄືນ ເງິນ ສຳ ເລັດ',
            data: result.data || null,
            status: true,
        });
    } catch (error) {
        console.error('❌ JDB refund error:', error.message);
        res.status(500).json({
            message: `JDB Error: ${error.response?.data?.message || error.message}`,
            status: false,
        });
    }
});

// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// JDB Direct Callback Handler (shared logic)
// Section 3 of JDB spec v1.7
// ═══════════════════════════════════════════════════════
async function handleJdbCallback(req, res) {
    const t = await db.sequelize.transaction();
    try {
        const callbackData = req.body;
        const signedHash = req.headers['signedhash'] || req.headers['SignedHash'];

        console.log('📩 JDB Callback received:', JSON.stringify(callbackData));
        console.log('📍 Path:', req.originalUrl);

        // ═══ 1. Verify SignedHash ═══
        if (process.env.JDB_SIGN_SECRET && signedHash) {
            const expectedHash = jdbService.generateSignedHash(JSON.stringify(callbackData));
            if (signedHash !== expectedHash) {
                console.warn('⚠️ JDB Callback SignedHash mismatch!');
                await t.rollback();
                return res.status(401).json({ message: 'Invalid SignedHash', status: false });
            }
        }

        const { billNumber, txnAmount, refNo, sourceName, sourceBank } = callbackData;
        const amount = parseFloat(txnAmount) || 0;

        console.log('✅ JDB Payment confirmed:', { billNumber, amount, refNo, sourceName, sourceBank });

        // ═══ 2. Update jdb_transactions → PAID ═══
        await db.jdb_transactions.update(
            {
                status: 'PAID',
                refNumber: refNo || null,
                apiResponse: JSON.stringify(callbackData),
            },
            { where: { billNumber }, transaction: t }
        );
        console.log(`💾 jdb_transactions updated: ${billNumber} → PAID`);

        // ═══ 3. Parse contractId from billNumber ═══
        // Format: MPAY{contractId}T{timestamp}
        const match = billNumber.match(/^MPAY(\d+)T/);
        const contractId = match ? parseInt(match[1]) : null;

        if (contractId && contractId > 0) {
            // ═══ 4. Verify contract exists ═══
            const contract = await db.loan_contracts.findByPk(contractId, { transaction: t });

            if (contract) {
                // ═══ 5. Find next unpaid installment ═══
                const nextSchedule = await db.loan_repayment_schedules.findOne({
                    where: { contract_id: contractId, is_paid: false },
                    order: [['installment_no', 'ASC']],
                    transaction: t,
                });

                let principalPaid = 0;
                let interestPaid = 0;

                if (nextSchedule) {
                    principalPaid = parseFloat(nextSchedule.principal_due) || 0;
                    interestPaid = parseFloat(nextSchedule.interest_due) || 0;

                    // ═══ 6. Update repayment schedule → PAID ═══
                    await nextSchedule.update({
                        is_paid: true,
                        paid_amount: amount,
                        paid_principal: principalPaid,
                        paid_interest: interestPaid,
                        status: 'PAID',
                    }, { transaction: t });
                    console.log(`📅 Schedule #${nextSchedule.installment_no} → PAID`);
                }

                // ═══ 7. Insert loan_transactions ═══
                await db.loan_transactions.create({
                    contract_id: contractId,
                    transaction_date: new Date(),
                    transaction_type: 'REPAYMENT',
                    amount_paid: amount,
                    principal_paid: principalPaid,
                    interest_paid: interestPaid,
                    penalty_paid: 0,
                    payment_method: 'JDB_QR',
                    reference_no: billNumber,
                }, { transaction: t });
                console.log(`💰 loan_transactions created: contract=${contractId}, amount=${amount}`);

                // ═══ 8. Update remaining_balance ═══
                if (principalPaid > 0) {
                    await db.loan_contracts.decrement('remaining_balance', {
                        by: principalPaid,
                        where: { id: contractId },
                        transaction: t,
                    });
                    console.log(`📉 remaining_balance -= ${principalPaid}`);
                }

                // ═══ 8.5 IT Service Fees ═══
                const FEE_RATE = parseFloat(process.env.IT_FEE_RATE || '0.005');
                const FEE_MIN = parseInt(process.env.IT_FEE_MIN || '1000');
                const FEE_MAX = parseInt(process.env.IT_FEE_MAX || '50000');
                const rawFee = amount * FEE_RATE;
                const itQrFee = Math.min(Math.max(rawFee, FEE_MIN), FEE_MAX);

                await db.loan_fees.create({
                    loan_id: contractId,
                    fee_type: 'IT_QR_FEE',
                    fee_amount: itQrFee,
                    deducted_from_loan: false,
                    notes: `QR fee: ${(FEE_RATE * 100).toFixed(1)}% of ${amount.toLocaleString()}₭ (Bill: ${billNumber})`,
                }, { transaction: t });
                console.log(`💼 IT_QR_FEE: ${itQrFee.toLocaleString()}₭ (${(FEE_RATE * 100).toFixed(1)}% of ${amount.toLocaleString()}₭)`);

            } else {
                console.warn(`⚠️ Contract ID ${contractId} not found — payment saved as standalone`);
            }
        }

        // ═══ 9. Audit log ═══
        await db.audit_logs.create({
            action: 'JDB_PAYMENT_CALLBACK',
            table_name: 'jdb_transactions',
            record_id: billNumber,
            new_values: { billNumber, txnAmount: amount, refNo, sourceName, sourceBank },
            description: `JDB QR payment: ${amount} LAK via ${sourceBank || 'JDB'}`,
            created_at: new Date(),
        }, { transaction: t });

        // ═══ 10. Notification ═══
        try {
            await db.notifications.create({
                type: 'PAYMENT',
                title: '💰 ຊຳ ລະ ຜ່ານ QR ສຳ ເລັດ',
                message: `ລູກ ຄ້າ ${sourceName || 'N/A'} ຊຳ ລະ ${amount.toLocaleString()} LAK ຜ່ານ JDB QR (Bill: ${billNumber})`,
                entity_type: 'jdb_transactions',
                entity_id: contractId || 0,
                is_read: false,
            }, { transaction: t });
        } catch (notifErr) {
            console.warn('⚠️ Notification create failed:', notifErr.message);
        }

        await t.commit();
        console.log('✅ JDB Callback processed successfully — all tables updated');

        res.json({ message: 'Callback received', status: true });
    } catch (error) {
        await t.rollback();
        console.error('❌ JDB Callback error:', error.message);
        res.status(500).json({ message: error.message, status: false });
    }
}

// POST /jdb/callback (original path)
router.post('/jdb/callback', handleJdbCallback);

// POST /v1/jdb/subscription (JDB subscription callback path)
// URL ທີ່ສົ່ງໃຫ້ JDB: http://202.137.144.159:3000/api/v1/jdb/subscription
router.post('/v1/jdb/subscription', handleJdbCallback);

// ═══════════════════════════════════════════════════════
// GET /jdb/test-connection
// ທົດ ສອບ ການ ເຊື່ອມ ຕໍ່ JDB API
// ═══════════════════════════════════════════════════════
router.get('/jdb/test-connection', async (req, res) => {
    const net = require('net');
    const https = require('https');

    const config = {
        baseUrl: process.env.JDB_BASE_URL || '❌ NOT SET',
        partnerId: process.env.JDB_PARTNER_ID || '❌ NOT SET',
        clientId: process.env.JDB_CLIENT_ID || '❌ NOT SET',
        merchantId: process.env.JDB_MERCHANT_ID || '❌ NOT SET',
        hasClientSecret: !!process.env.JDB_CLIENT_SECRET,
        hasSignSecret: !!process.env.JDB_SIGN_SECRET,
        callbackUrl: process.env.JDB_CALLBACK_URL || 'NOT SET',
    };

    // 1. Get public IP
    let publicIp = 'unknown';
    try {
        const ipRes = await require('axios').get('https://api.ipify.org?format=json', { timeout: 5000 });
        publicIp = ipRes.data.ip;
    } catch (e) { publicIp = 'ບໍ່ ສາ ມາດ ກວດ ໄດ້'; }

    // 2. Quick TCP check to JDB (3 second timeout)
    let tcpReachable = false;
    try {
        const url = new URL(process.env.JDB_BASE_URL);
        const host = url.hostname;
        const port = parseInt(url.port) || 443;

        tcpReachable = await new Promise((resolve) => {
            const sock = new net.Socket();
            sock.setTimeout(3000);
            sock.on('connect', () => { sock.destroy(); resolve(true); });
            sock.on('timeout', () => { sock.destroy(); resolve(false); });
            sock.on('error', () => { sock.destroy(); resolve(false); });
            sock.connect(port, host);
        });
    } catch (e) { tcpReachable = false; }

    if (!tcpReachable) {
        return res.json({
            message: '❌ JDB ເຊື່ອມ ຕໍ່ ບໍ່ ໄດ້ — ເຄືອ ຂ່າຍ ບໍ່ ເຖິງ JDB server',
            data: {
                config,
                publicIp,
                tcpReachable: false,
                authenticated: false,
                hint: `IP ປັດ ຈຸ ບັນ: ${publicIp} — ກະ ລຸ ນາ ຂໍ ໃຫ້ JDB whitelist IP ນີ້`,
                jdbHost: 'dynamicqr.jdbbank.com.la',
                jdbPort: 12000,
            },
            status: false,
        });
    }

    // 3. Try to authenticate
    try {
        const token = await jdbService.authenticate();

        res.json({
            message: '✅ JDB ເຊື່ອມ ຕໍ່ ສຳ ເລັດ',
            data: {
                config,
                publicIp,
                tcpReachable: true,
                authenticated: true,
                tokenPreview: token ? `${token.slice(0, 20)}...` : null,
            },
            status: true,
        });
    } catch (error) {
        console.error('❌ JDB test-connection error:', error.message);
        res.json({
            message: `❌ JDB auth ບໍ່ ສຳ ເລັດ: ${error.message}`,
            data: {
                config,
                publicIp,
                tcpReachable: true,
                authenticated: false,
                error: error.response?.data || error.message,
            },
            status: false,
        });
    }
});

module.exports = router;
