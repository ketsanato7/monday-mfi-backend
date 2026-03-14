/**
 * lmps.service.js — LMPS/LAPNET Core Service
 * ✅ LMPS v8.7.4 Spec Compliant
 *
 * Features:
 * - RSA 2048-bit key generation
 * - SHA256withRSA signing & verification
 * - Reference generation (20-char alphanumeric)
 * - Lao National QR code generation (EMVCo + CRC-16)
 * - LMPS API calls (inquiry, transfer, check status)
 */
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════
// 1. RSA Key Management (Section 4.1 + 9)
// ═══════════════════════════════════════════════════════

/**
 * Generate RSA 2048-bit key pair
 * @returns {{ publicKey: string, privateKey: string }} PEM format
 */
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
}

/**
 * Sign data with RSA private key (SHA256withRSA → HEX)
 * @param {string} data - HTTP body string
 * @param {string} privateKeyPem - PEM format private key
 * @returns {string} HEX signature
 */
function signData(data, privateKeyPem) {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKeyPem, 'hex');
}

/**
 * Verify signature with RSA public key
 * @param {string} data - HTTP body string
 * @param {string} signature - HEX signature
 * @param {string} publicKeyPem - PEM format public key
 * @returns {boolean}
 */
function verifySignature(data, signature, publicKeyPem) {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKeyPem, signature, 'hex');
}

// ═══════════════════════════════════════════════════════
// 2. Reference Generation (Section 10)
// ═══════════════════════════════════════════════════════

const REFERENCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate LMPS-compliant reference (20 uppercase alphanumeric)
 * @returns {string} 20-char reference
 */
function generateReference() {
    let ref = '';
    const bytes = crypto.randomBytes(20);
    for (let i = 0; i < 20; i++) {
        ref += REFERENCE_CHARS[bytes[i] % REFERENCE_CHARS.length];
    }
    return ref;
}

// ═══════════════════════════════════════════════════════
// 3. Lao National QR Code (Section 14.5)
// ═══════════════════════════════════════════════════════

/**
 * Build TLV (Tag-Length-Value) string for EMVCo QR
 */
function tlv(tag, value) {
    const len = String(value.length).padStart(2, '0');
    return `${tag}${len}${value}`;
}

/**
 * CRC-16/CCITT-FALSE checksum (Section 15)
 * Polynomial: 0x1021, Initial: 0xFFFF
 */
function crc16CcittFalse(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate Lao National QR code string (EMVCo standard)
 * @param {Object} params
 * @param {string} params.merchantId - ລະຫັດຮ້ານຄ້າ/MFI (max 15 chars)
 * @param {string} params.merchantName - ຊື່ຮ້ານ (max 25 chars, Latin only)
 * @param {string} params.merchantCity - ເມືອງ (max 15 chars)
 * @param {string} params.acquirerIIN - IIN ທະນາຄານ acquirer (e.g. 27710418)
 * @param {string} params.forwardingIIN - IIN forwarding (default: 00520446)
 * @param {string} params.paymentType - 001=Credit, 002=QR Payment, 003=Bill
 * @param {number} [params.amount] - ຈຳນວນເງິນ (ຖ້າ dynamic QR)
 * @param {string} [params.mcc] - Merchant Category Code (default: 5813)
 * @param {Object} [params.additionalData] - Tag 62 sub-fields
 * @returns {string} Full EMVCo QR string with CRC
 */
function generateLaoQR({
    merchantId,
    merchantName,
    merchantCity = 'VTE',
    acquirerIIN,
    forwardingIIN = '00520446',
    paymentType = '002',
    amount = null,
    mcc = '5813',
    additionalData = {},
}) {
    const AID = 'A005266284662577';

    // Tag 38: Lao National QR
    const tag38Content =
        tlv('00', AID) +
        tlv('01', acquirerIIN) +
        tlv('02', paymentType) +
        tlv('03', merchantId);

    // Tag 15: UnionPay (for China cross-border)
    const tag15Content =
        tlv('00', acquirerIIN) +
        tlv('01', forwardingIIN) +
        tlv('02', merchantId.slice(0, 15));

    let qr = '';
    qr += tlv('00', '01');                                    // Payload format
    qr += tlv('01', amount ? '12' : '11');                   // 11=static, 12=dynamic
    qr += tlv('15', tag15Content);                            // UnionPay tag
    qr += tlv('38', tag38Content);                            // Lao National QR
    qr += tlv('52', mcc);                                     // MCC
    qr += tlv('53', '418');                                   // LAK currency
    if (amount) {
        qr += tlv('54', String(amount));                      // Amount (dynamic only)
    }
    qr += tlv('58', 'LA');                                    // Country
    qr += tlv('59', merchantName.slice(0, 25));               // Merchant name
    qr += tlv('60', merchantCity.slice(0, 15));               // Merchant city

    // Tag 62: Additional data
    if (Object.keys(additionalData).length > 0) {
        let tag62Content = '';
        if (additionalData.billNumber) tag62Content += tlv('01', additionalData.billNumber);
        if (additionalData.mobileNumber) tag62Content += tlv('02', additionalData.mobileNumber);
        if (additionalData.storeLabel) tag62Content += tlv('03', additionalData.storeLabel);
        if (additionalData.referenceLabel) tag62Content += tlv('05', additionalData.referenceLabel);
        if (additionalData.terminalLabel) tag62Content += tlv('07', additionalData.terminalLabel);
        if (additionalData.purpose) tag62Content += tlv('08', additionalData.purpose);
        if (tag62Content) qr += tlv('62', tag62Content);
    }

    // Tag 63: CRC
    const withCrcTag = qr + '6304';
    const crc = crc16CcittFalse(withCrcTag);
    return withCrcTag + crc;
}

// ═══════════════════════════════════════════════════════
// 4. LMPS API Helpers
// ═══════════════════════════════════════════════════════

/**
 * Build LMPS request headers
 * @param {string} body - JSON body string
 * @param {string} privateKey - PEM private key
 * @returns {Object} Headers object
 */
function buildRequestHeaders(body, privateKey) {
    return {
        'Content-Type': 'application/json',
        'X-Source-Request-Signature': signData(body, privateKey),
    };
}

/**
 * Verify LAPNET response headers
 * @param {string} body - Response body string
 * @param {Object} headers - Response headers
 * @param {string} lapnetPublicKey - LAPNET public key PEM
 * @returns {boolean}
 */
function verifyResponseHeaders(body, headers, lapnetPublicKey) {
    const lapnetSig = headers['x-lapnet-response-signature'] || headers['X-LAPNET-Response-Signature'];
    if (!lapnetSig) return false;
    return verifySignature(body, lapnetSig, lapnetPublicKey);
}

/**
 * Build Outgoing Inquiry request body (Section 5.1)
 */
function buildInquiryRequest({
    fromMember, fromUser, fromUserFullname, fromAccount,
    fromAccountType, toType, toAccount, toMember,
}) {
    return {
        frommember: fromMember,
        fromuser: fromUser,
        fromuserfullname: fromUserFullname,
        fromaccount: fromAccount,
        fromaccounttype: fromAccountType || 'PERSONAL',
        totype: toType || 'ACCOUNT',
        toaccount: toAccount,
        tomember: toMember || '',
        reference: generateReference(),
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
}

/**
 * Build Outgoing Transfer request body (Section 5.3)
 */
function buildTransferRequest({
    fromMember, fromUser, fromUserFullname, fromAccount,
    fromAccountType, toType, toAccount, toMember,
    reference, amount, fee, ccy, purpose,
}) {
    return {
        frommember: fromMember,
        fromuser: fromUser,
        fromuserfullname: fromUserFullname,
        fromaccount: fromAccount,
        fromaccounttype: fromAccountType || 'PERSONAL',
        totype: toType || 'ACCOUNT',
        toaccount: toAccount,
        tomember: toMember || '',
        reference: reference,
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        amount: amount,
        fee: fee || 0,
        ccy: ccy || 'LAK',
        purpose: purpose || '',
    };
}

/**
 * Build Incoming Inquiry response (Section 5.2.2)
 */
function buildInquiryResponse({
    result, reference, accountName, accountCcy,
    originalMessage, amount, purposeRequired,
}) {
    return {
        result: result || 'OK',
        reference: reference,
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        originalmessage: originalMessage,
        accountname: accountName,
        accountccy: accountCcy || 'LAK',
        ...(amount && { amount }),
        ...(purposeRequired !== undefined && { purposerequired: purposeRequired ? 1 : 0 }),
    };
}

/**
 * Build Incoming Transfer response (Section 5.4.2)
 */
function buildTransferResponse({ result, shouldRevert, reference, originalMessage }) {
    return {
        result: result || 'OK',
        shouldrevert: shouldRevert || 0,
        reference: reference,
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        originalmessage: originalMessage,
    };
}

// ═══════════════════════════════════════════════════════
// 5. Member IIN Lookup (Section 14.4)
// ═══════════════════════════════════════════════════════

const MEMBER_IIN = {
    ACLE: '70080418', APB: '70020418', BCEL: '27710418',
    BIC: '70110418', BOC: '70100418', ICBC: '70070418',
    IDB: '70140418', JDB: '32170418', LDB: '70030418',
    LVB: '70050418', MJB: '70040418', SACOM: '70130418',
    STB: '70150418', KBank: '70170418', VTB: '70120418',
    BFL: '37160418',
};

/**
 * Get IIN by member code
 */
function getMemberIIN(memberCode) {
    return MEMBER_IIN[memberCode] || null;
}

// ═══════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════

module.exports = {
    // RSA
    generateKeyPair,
    signData,
    verifySignature,

    // Reference
    generateReference,

    // QR
    generateLaoQR,
    crc16CcittFalse,
    tlv,

    // API Helpers
    buildRequestHeaders,
    verifyResponseHeaders,
    buildInquiryRequest,
    buildTransferRequest,
    buildInquiryResponse,
    buildTransferResponse,

    // IIN
    getMemberIIN,
    MEMBER_IIN,
};
