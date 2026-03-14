/**
 * jdb.service.js — JDB Dynamic QR Payment API Service
 * 
 * Based on JDB BACKEND WEB API V.1.7 — QR dynamic Spec
 * 
 * Functions:
 *   authenticate()                  → ຂໍ access token (cached)
 *   generateQR({ ... })            → ສ້າງ QR code (EMV + image)
 *   checkTransaction(billNumber)   → ກວດສະຖານະ ດ້ວຍ billNumber
 *   checkTransactionByRef(opts)    → ກວດສະຖານະ ດ້ວຍ reference
 *   disableBill(billNumber)        → ຍົກເລີກ bill
 *   refund({ ... })                → ຄືນເງິນ
 */
const logger = require('../config/logger');
const crypto = require('crypto');
const axios = require('axios');
const QRCode = require('qrcode');

// ═══ Config from .env ═══
const JDB_BASE = process.env.JDB_BASE_URL;
const PARTNER_ID = process.env.JDB_PARTNER_ID;   // MPAY
const CLIENT_ID = process.env.JDB_CLIENT_ID;     // MPAY
const CLIENT_SECRET = process.env.JDB_CLIENT_SECRET;
const MERCHANT_ID = process.env.JDB_MERCHANT_ID;
const SIGN_SECRET = process.env.JDB_SIGN_SECRET;

// ═══ Token cache ═══
let cachedToken = null;
let tokenExpiry = 0;

// ═══ Generate unique requestId (up to 25 chars) ═══
function genRequestId(prefix = 'MFI') {
    return `${prefix}${Date.now()}`.slice(0, 25);
}

// ═══════════════════════════════════════════════════════
// SignedHash — HMAC-SHA256
// Based on JDB spec section 2.7
// The hash is computed over the raw JSON body string
// ═══════════════════════════════════════════════════════
function generateSignedHash(bodyString) {
    if (!SIGN_SECRET) {
        logger.warn('⚠️ JDB_SIGN_SECRET not configured — SignedHash will be empty');
        return '';
    }
    const mac = crypto.createHmac('sha256', SIGN_SECRET);
    mac.update(bodyString);
    return mac.digest('hex');
}

// ═══════════════════════════════════════════════════════
// 2.1 — Authenticate
// POST /autenticate
// ═══════════════════════════════════════════════════════
async function authenticate() {
    // Return cached token if still valid
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const body = {
        requestId: genRequestId('AUTH'),
        partnerId: PARTNER_ID,
        clientId: CLIENT_ID,
        clientScret: CLIENT_SECRET,  // Note: JDB API uses "clientScret" (typo in their spec)
    };

    const bodyString = JSON.stringify(body);
    const signedHash = generateSignedHash(bodyString);

    logger.info('🔐 JDB Authenticating...');
    const res = await axios.post(`${JDB_BASE}/autenticate`, body, {
        headers: {
            'Content-Type': 'application/json',
            SignedHash: signedHash,
        },
        timeout: 15000,
    });

    if (!res.data.success) {
        throw new Error(`JDB Auth failed: ${res.data.message}`);
    }

    cachedToken = res.data.data.accessToken;
    // Cache token, expire 30 seconds before actual expiry
    const expiresIn = res.data.data.expiresIn || 999;
    tokenExpiry = Date.now() + (expiresIn * 1000) - 30000;

    logger.info(`✅ JDB Token obtained (expires in ${expiresIn}s)`);
    return cachedToken;
}

// ═══════════════════════════════════════════════════════
// 2.2 — Generate emvCode (QR)
// POST /generateQr
// ═══════════════════════════════════════════════════════
async function generateQR({ amount, billNumber, terminalId, terminalLabel, mobileNo }) {
    const token = await authenticate();

    const body = {
        requestId: genRequestId('QR'),
        partnerId: PARTNER_ID,
        mechantId: MERCHANT_ID,    // Note: JDB API uses "mechantId" (typo in their spec)
        txnAmount: amount,
        billNumber,
        terminalId: terminalId || 'MFI001',
        terminalLabel: terminalLabel || 'MFI-LOAN',
        mobileNo: mobileNo || '2000000000',
    };

    const bodyString = JSON.stringify(body);
    const signedHash = generateSignedHash(bodyString);

    logger.info(`🏗️ JDB Generating QR — bill: ${billNumber}, amount: ${amount}`);

    const res = await axios.post(`${JDB_BASE}/generateQr`, body, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            SignedHash: signedHash,
        },
        timeout: 15000,
    });

    if (!res.data.success) {
        throw new Error(`JDB Generate QR failed: ${res.data.message}`);
    }

    const { mcid, emv } = res.data.data;

    // Generate QR image from EMV code as data URL
    let qrImageDataUrl = null;
    try {
        qrImageDataUrl = await QRCode.toDataURL(emv, {
            width: 400,
            margin: 2,
            errorCorrectionLevel: 'M',
        });
    } catch (qrErr) {
        logger.error('⚠️ QR image generation failed:', qrErr.message);
    }

    return {
        mcid,
        emv,
        qrImage: qrImageDataUrl,
        billNumber,
        amount,
        transactionId: res.data.transactionId,
        paymentLink: process.env.JDB_YES_LINK_BASE
            ? `${process.env.JDB_YES_LINK_BASE}/${emv}`
            : null,
    };
}

// ═══════════════════════════════════════════════════════
// 2.4 — Check Transaction by bill number
// POST /checkTransaction
// ═══════════════════════════════════════════════════════
async function checkTransaction(billNumber) {
    const token = await authenticate();

    const body = {
        requestId: genRequestId('CHK'),
        billNumber,
    };

    const bodyString = JSON.stringify(body);
    const signedHash = generateSignedHash(bodyString);

    const res = await axios.post(`${JDB_BASE}/checkTransaction`, body, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            SignedHash: signedHash,
        },
        timeout: 15000,
    });

    return res.data;
}

// ═══════════════════════════════════════════════════════
// 2.5 — Check Transaction by Reference
// POST /checkTransactionByRef
// ═══════════════════════════════════════════════════════
async function checkTransactionByRef({ bankCode, reference }) {
    const token = await authenticate();

    const body = {
        requestId: genRequestId('CHKR'),
        bankCode: bankCode || 'JDB',
        partnerId: PARTNER_ID,
        reference,
    };

    const bodyString = JSON.stringify(body);
    const signedHash = generateSignedHash(bodyString);

    const res = await axios.post(`${JDB_BASE}/checkTransactionByRef`, body, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            SignedHash: signedHash,
        },
        timeout: 15000,
    });

    return res.data;
}

// ═══════════════════════════════════════════════════════
// 2.3 — Disable bill number
// POST /disableBillNumber
// ═══════════════════════════════════════════════════════
async function disableBill(billNumber) {
    const token = await authenticate();

    const body = {
        requestId: genRequestId('DIS'),
        partnerId: PARTNER_ID,
        billNumber,
    };

    const bodyString = JSON.stringify(body);
    const signedHash = generateSignedHash(bodyString);

    logger.info(`🚫 JDB Disabling bill: ${billNumber}`);

    const res = await axios.post(`${JDB_BASE}/disableBillNumber`, body, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            SignedHash: signedHash,
        },
        timeout: 15000,
    });

    return res.data;
}

// ═══════════════════════════════════════════════════════
// 2.6 — Refund transaction
// POST /reFund
// ═══════════════════════════════════════════════════════
async function refund({ txnAmount, billNumber, remark }) {
    const token = await authenticate();

    const body = {
        requestId: genRequestId('REF'),
        partnerId: PARTNER_ID,
        txnAmount,
        billNumber,
        remark: remark || '',
    };

    const bodyString = JSON.stringify(body);
    const signedHash = generateSignedHash(bodyString);

    logger.info(`💸 JDB Refund — bill: ${billNumber}, amount: ${txnAmount}`);

    const res = await axios.post(`${JDB_BASE}/reFund`, body, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            SignedHash: signedHash,
        },
        timeout: 15000,
    });

    return res.data;
}

module.exports = {
    authenticate,
    generateQR,
    checkTransaction,
    checkTransactionByRef,
    disableBill,
    refund,
    generateSignedHash,
    genRequestId,
};
