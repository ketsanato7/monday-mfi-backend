/**
 * etl.service.js — ETL Payment SSL API V1.0.6 Integration Service
 * 
 * SOAP/XML over HTTPS with SHA512 checksum authentication
 * Based on: ETL Payment SSL API V1.0.6-2024.pdf
 *
 * Functions:
 *   generateKeyCode(params)              → SHA512 signature
 *   queryPrepaidBalance(msisdn)          → ກວດຍອດ Prepaid
 *   querySubscriberType(msisdn)          → ກວດ Prepaid/Postpaid
 *   queryPostPaidDebt(msisdn)            → ກວດໜີ້ Postpaid mobile
 *   queryPSTNDebt(pstnNumber)            → ກວດໜີ້ PSTN/ໂທລະສັບບ້ານ
 *   queryInternetDebt(internetID)        → ກວດໜີ້ Internet
 *   queryInternetPayType(internetID)     → ກວດ Prepaid/Postpaid Internet
 *   topupPrepaid(msisdn, amount)         → ເຕີມເງິນ Prepaid
 *   topupPrepaidMasterSim(msisdn, amt)   → ເຕີມຜ່ານ MasterSim
 *   topupInternetPrepaid(internetID,amt) → ເຕີມ Internet Prepaid
 *   paymentPostpaid(msisdn,amt,billdate) → ຈ່າຍ Postpaid mobile
 *   paymentPSTN(pstnNumber,amt,billdate) → ຈ່າຍ PSTN
 *   paymentInternet(internetID,amt,bill) → ຈ່າຍ Internet
 *   queryTransaction(serialNumber,msisdn)→ ກວດສະຖານະ transaction
 *   smartPay(target, amount)             → Auto query → pay/topup
 */
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../config/logger');
const db = require('../models');
const sequelize = db.sequelize;

// ═══════════════════════════════════════════════════════════
// Config — ດຶງຈາກ .env ຫຼື DB (payment_provider_configs)
// ═══════════════════════════════════════════════════════════
let _configCache = null;
let _configExpiry = 0;

async function getConfig() {
    // Try DB config first (payment_provider_configs table)
    if (_configCache && Date.now() < _configExpiry) return _configCache;

    try {
        const [rows] = await sequelize.query(`
            SELECT config_key, config_value FROM payment_provider_configs
            WHERE provider = 'ETL' AND is_active = true AND deleted_at IS NULL
            ORDER BY id DESC
        `);
        if (rows.length > 0) {
            const cfg = {};
            for (const r of rows) cfg[r.config_key] = r.config_value;
            if (cfg.user_id && cfg.sign_key && cfg.api_url) {
                _configCache = {
                    userID: cfg.user_id,
                    signKey: cfg.sign_key,
                    apiUrl: cfg.api_url,
                };
                _configExpiry = Date.now() + 5 * 60 * 1000; // cache 5 min
                return _configCache;
            }
        }
    } catch {
        // Table may not exist yet — fallback to .env
    }

    // Fallback to .env
    return {
        userID: process.env.ETL_USER_ID || '',
        signKey: process.env.ETL_SIGN_KEY || '',
        apiUrl: process.env.ETL_API_URL || 'https://manage.etllao.com:8889/services/ETLPaymentTopup',
    };
}

// ═══════════════════════════════════════════════════════════
// Transaction ID Generator (unique 18-char)
// ═══════════════════════════════════════════════════════════
function generateTransactionId(prefix = 'MFI') {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 100)}`.slice(0, 18);
}

// ═══════════════════════════════════════════════════════════
// DateTime formatter → yyyy-mm-dd HH:mm:ss
// ═══════════════════════════════════════════════════════════
function formatDateTime() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ═══════════════════════════════════════════════════════════
// SHA512 KeyCode Generator (Index 1 of ETL API doc)
// Format: charset=utf-8&userID=xxx&transactionID=xxx&msisdn=xxx
//         &dateTimeProcess=xxx&amount=xxx&sign_type=SHA512
//         &signkey=xxx&url=<apiUrl>/
// → SHA512 → UPPERCASE
// ═══════════════════════════════════════════════════════════
function generateKeyCode({ userID, transactionID, msisdn, dateTimeProcess, amount, signKey, apiUrl }) {
    const plainText = `charset=utf-8&userID=${userID}&transactionID=${transactionID}&msisdn=${msisdn}&dateTimeProcess=${dateTimeProcess}&amount=${amount}&sign_type=SHA512&signkey=${signKey}&url=${apiUrl}/`;

    const hash = crypto.createHash('sha512').update(plainText).digest('hex');
    return hash.toUpperCase();
}

// ═══════════════════════════════════════════════════════════
// XML Builder — ສ້າງ SOAP envelope
// ═══════════════════════════════════════════════════════════
function buildSoapXml(functionName, params) {
    const paramXml = Object.entries(params)
        .map(([key, val]) => `          <web:${key}>${val}</web:${key}>`)
        .join('\n');

    return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:web="http://webservice.etlpayemtandtopup.com">
   <soap:Header/>
   <soap:Body>
      <web:${functionName}>
${paramXml}
      </web:${functionName}>
   </soap:Body>
</soap:Envelope>`;
}

// ═══════════════════════════════════════════════════════════
// XML Parser — extract values from SOAP response
// ═══════════════════════════════════════════════════════════
function extractXmlValue(xml, tagName) {
    // Match <ax25:tagName>value</ax25:tagName> or <ax21:tagName>value</ax21:tagName>
    const regex = new RegExp(`<ax2[0-9]:${tagName}[^>]*>([^<]*)<`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
}

function extractAllXmlValues(xml, tagNames) {
    const result = {};
    for (const tag of tagNames) {
        result[tag] = extractXmlValue(xml, tag);
    }
    return result;
}

// ═══════════════════════════════════════════════════════════
// Generic SOAP Caller
// ═══════════════════════════════════════════════════════════
async function callSoap(functionName, soapXml, config) {
    const url = config.apiUrl;

    logger.info(`📡 ETL SOAP call: ${functionName} → ${url}`);

    try {
        const response = await axios.post(url, soapXml, {
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'SOAPAction': functionName,
            },
            timeout: 30000,
            // ETL uses self-signed SSL in some environments
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            logger.error(`❌ ETL SOAP error (${error.response.status}): ${error.response.data}`);
            throw new Error(`ETL API error: ${error.response.status}`);
        }
        logger.error(`❌ ETL connection error: ${error.message}`);
        throw new Error(`ETL connection failed: ${error.message}`);
    }
}

// ═══════════════════════════════════════════════════════════
// Transaction Logger — ບັນທຶກທຸກ ETL call ລົງ DB
// ═══════════════════════════════════════════════════════════
async function logTransaction({ transactionId, functionName, msisdn, internetId, pstnNumber, amount, resultCode, resultDes, requestXml, responseXml, status, userId }) {
    try {
        await sequelize.query(`
            INSERT INTO etl_transactions 
                (transaction_id, function_name, msisdn, internet_id, pstn_number, amount,
                 result_code, result_description, request_xml, response_xml, status,
                 created_by, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
        `, {
            bind: [transactionId, functionName, msisdn || null, internetId || null,
                pstnNumber || null, amount || 0, resultCode || null, resultDes || null,
                requestXml || null, responseXml || null, status || 'pending', userId || null],
        });
    } catch (err) {
        logger.warn(`⚠️ ETL transaction log failed: ${err.message}`);
    }
}

// ═══════════════════════════════════════════════════════════
// Error Code Mapping → ຂໍ້ຄວາມລາວ
// ═══════════════════════════════════════════════════════════
const ETL_ERROR_CODES = {
    '405000000': { message: 'ສຳເລັດ', success: true },
    '405610023': { message: 'ເບີບໍ່ມີໃນລະບົບ', success: false },
    '405610052': { message: 'ບໍລິການຊ້ຳ', success: false },
    '405914012': { message: 'ຍອດເງິນບໍ່ພຽງພໍ', success: false },
    '405400072': { message: 'ທຸລະກຳນີ້ໄດ້ດຳເນີນການແລ້ວ', success: false },
    '405610071': { message: 'ເບີຖືກລະງັບການໃຊ້ງານ', success: false },
    '405010000': { message: 'ກຳລັງດຳເນີນການ', success: false },
    '405914998': { message: 'ສະຖານະເບີຜິດພາດ', success: false },
    '405610009': { message: 'ບໍ່ພົບເບີໃນລະບົບ', success: false },
    '100000001': { message: 'ສິດການເຂົ້າເຖິງຖືກປະຕິເສດ (userID ບໍ່ຖືກ)', success: false },
    '100000002': { message: 'ລະບົບ ETL ມີການໃຊ້ງານຫຼາຍ — ກະລຸນາລໍຖ້າ', success: false },
    '100000003': { message: 'ພາຣາມິເຕີບໍ່ຖືກຕ້ອງ', success: false },
    '100000005': { message: 'ຮູບແບບເບີບໍ່ຖືກຕ້ອງ', success: false },
    '100000006': { message: 'ຮູບແບບວັນເວລາບໍ່ຖືກຕ້ອງ', success: false },
    '100000007': { message: 'ຮູບແບບ Transaction ID ບໍ່ຖືກຕ້ອງ', success: false },
    '100000008': { message: 'ເບີປາຍທາງບໍ່ຮອງຮັບ', success: false },
    '100000009': { message: 'ຍອດ Master SIM ບໍ່ພຽງພໍ', success: false },
    '100000010': { message: 'ກຳລັງດຳເນີນການ — ກະລຸນາກວດສອບອີກຄັ້ງ', success: false, pending: true },
    '100000011': { message: 'ກຳລັງດຳເນີນການ — ກະລຸນາກວດສອບອີກຄັ້ງ', success: false, pending: true },
    '100000014': { message: 'ຂໍ້ຜິດພາດ Subtype', success: false },
    '100000015': { message: 'ເລກນຳໜ້າ ETL ບໍ່ຖືກຕ້ອງ', success: false },
    '100000016': { message: 'ທຸລະກຳນີ້ໄດ້ດຳເນີນການແລ້ວ', success: false },
    '100000017': { message: 'ສິດບໍ່ອະນຸຍາດ', success: false },
    '100000018': { message: 'ຈຳນວນເກີນຂອບເຂດ', success: false },
    '100000020': { message: 'ວັນບິນບໍ່ກົງກັນ', success: false },
    '100000021': { message: 'ບໍ່ພົບ Service ID', success: false },
    '100000022': { message: 'keyCode ບໍ່ຖືກຕ້ອງ', success: false },
    '100000151': { message: 'ຮູບແບບ keyCode ຜິດ', success: false },
};

function mapResultCode(code) {
    return ETL_ERROR_CODES[code] || { message: `ຂໍ້ຜິດພາດ: ${code}`, success: false };
}

// ═══════════════════════════════════════════════════════════
// ① queryPrepaidBalance — ກວດຍອດເງິນ Prepaid
// ═══════════════════════════════════════════════════════════
async function queryPrepaidBalance(msisdn, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('QPB');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn,
        dateTimeProcess, amount: '0', signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('queryPreapidBalance', {
        userID: config.userID, msisdn, transactionID,
        dateTimeProcess, keyCode, amount: '0',
    });

    const responseXml = await callSoap('queryPreapidBalance', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'remainBalance']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'queryPrepaidBalance',
        msisdn, amount: 0, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return {
        success: mapped.success,
        message: mapped.message,
        data: { remainBalance: data.remainBalance, transaction: data.transaction },
        resultCode: data.resultcode,
    };
}

// ═══════════════════════════════════════════════════════════
// ② querySubscriberType — ກວດ Prepaid/Postpaid
// ═══════════════════════════════════════════════════════════
async function querySubscriberType(msisdn, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('QST');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn,
        dateTimeProcess, amount: '0', signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('querySubscriberType', {
        userID: config.userID, msisdn, transactionID,
        dateTimeProcess, keyCode, amount: '0',
    });

    const responseXml = await callSoap('querySubscriberType', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'subscriberType']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'querySubscriberType',
        msisdn, amount: 0, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return {
        success: mapped.success,
        message: mapped.message,
        data: {
            subscriberType: data.subscriberType,
            typeName: data.subscriberType === '0' ? 'Prepaid' : data.subscriberType === '1' ? 'Postpaid' : 'Unknown',
            transaction: data.transaction,
        },
        resultCode: data.resultcode,
    };
}

// ═══════════════════════════════════════════════════════════
// ③ queryPostPaidDebt — ກວດໜີ້ Postpaid
// ═══════════════════════════════════════════════════════════
async function queryPostPaidDebt(msisdn, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('QPD');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn,
        dateTimeProcess, amount: '0', signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('queryPostPaidDebt', {
        userID: config.userID, msisdn, transactionID,
        dateTimeProcess, keyCode, amount: '0',
    });

    const responseXml = await callSoap('queryPostPaidDebt', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'unPaidAmount', 'usageAmount', 'advanceAmount', 'customerName']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'queryPostPaidDebt',
        msisdn, amount: 0, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return {
        success: mapped.success, message: mapped.message,
        data: {
            unPaidAmount: data.unPaidAmount, usageAmount: data.usageAmount,
            advanceAmount: data.advanceAmount, customerName: data.customerName,
            transaction: data.transaction,
        },
        resultCode: data.resultcode,
    };
}

// ═══════════════════════════════════════════════════════════
// ④ queryPSTNDebt — ກວດໜີ້ PSTN
// ═══════════════════════════════════════════════════════════
async function queryPSTNDebt(pstnNumber, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('QPN');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn: pstnNumber,
        dateTimeProcess, amount: '0', signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('queryPSTNDebt', {
        userID: config.userID, pstnNumber, transactionID,
        dateTimeProcess, keyCode, amount: '0',
    });

    const responseXml = await callSoap('queryPSTNDebt', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'unPaidAmount', 'usageAmount', 'advanceAmount', 'customerName']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'queryPSTNDebt',
        pstnNumber, amount: 0, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑤ queryInternetDebt — ກວດໜີ້ Internet
// ═══════════════════════════════════════════════════════════
async function queryInternetDebt(internetID, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('QID');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn: internetID,
        dateTimeProcess, amount: '0', signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('queryInternetDebt', {
        userID: config.userID, internetID, transactionID,
        dateTimeProcess, keyCode, amount: '0',
    });

    const responseXml = await callSoap('queryInternetDebt', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'unPaidAmount', 'usageAmount', 'advanceAmount', 'customerName']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'queryInternetDebt',
        internetId: internetID, amount: 0, resultCode: data.resultcode,
        resultDes: data.resultDes, requestXml: xml, responseXml,
        status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑥ queryInternetPayType — ກວດ Prepaid/Postpaid Internet
// ═══════════════════════════════════════════════════════════
async function queryInternetPayType(internetID, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('QIP');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn: internetID,
        dateTimeProcess, amount: '0', signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('queryInternetPayType', {
        userID: config.userID, internetID, transactionID,
        dateTimeProcess, keyCode, amount: '0',
    });

    const responseXml = await callSoap('queryInternetPayType', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'payType']);
    const mapped = mapResultCode(data.resultcode);

    return {
        success: mapped.success, message: mapped.message,
        data: {
            payType: data.payType,
            typeName: data.payType === '0' ? 'Prepaid' : data.payType === '1' ? 'Postpaid' : 'Unknown',
        },
        resultCode: data.resultcode,
    };
}

// ═══════════════════════════════════════════════════════════
// ⑦ topupPrepaid — ເຕີມເງິນ Prepaid
// ═══════════════════════════════════════════════════════════
async function topupPrepaid(msisdn, amount, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('TUP');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn,
        dateTimeProcess, amount: String(amount), signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('topupPrepaid', {
        userID: config.userID, msisdn, topupAmt: String(amount),
        transactionID, dateTimeProcess, keyCode,
    });

    const responseXml = await callSoap('topupPrepaid', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'beforeBalance', 'afterBalance', 'topupAmount']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'topupPrepaid',
        msisdn, amount, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑧ topupPrepaidMasterSim — ເຕີມຜ່ານ Master SIM
// ═══════════════════════════════════════════════════════════
async function topupPrepaidMasterSim(msisdn, amount, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('TMS');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn,
        dateTimeProcess, amount: String(amount), signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('topupPrepaidMasterSim', {
        userID: config.userID, msisdn, topupAmt: String(amount),
        transactionID, dateTimeProcess, keyCode,
    });

    const responseXml = await callSoap('topupPrepaidMasterSim', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'beforeBalance', 'afterBalance', 'topupAmount']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'topupPrepaidMasterSim',
        msisdn, amount, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑨ topupInternetPrepaid — ເຕີມ Internet Prepaid
// ═══════════════════════════════════════════════════════════
async function topupInternetPrepaid(internetID, amount, billdate, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('TIP');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn: internetID,
        dateTimeProcess, amount: String(amount), signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('topupInternetPrepaid', {
        userID: config.userID, internetID, topupAmt: String(amount),
        transactionID, billdate: billdate || new Date().toISOString().slice(0, 7).replace('-', ''),
        dateTimeProcess, keyCode,
    });

    const responseXml = await callSoap('topupInternetPrepaid', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'afterBalance', 'topupAmount']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'topupInternetPrepaid',
        internetId: internetID, amount, resultCode: data.resultcode,
        resultDes: data.resultDes, requestXml: xml, responseXml,
        status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑩ paymentPostpaid — ຈ່າຍ Postpaid Mobile
// ═══════════════════════════════════════════════════════════
async function paymentPostpaid(msisdn, amount, billdate, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('PPD');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn,
        dateTimeProcess, amount: String(amount), signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('paymentPostpaid', {
        msisdn, paymentAmt: String(amount), transactionID,
        billdate: billdate || new Date().toISOString().slice(0, 7).replace('-', ''),
        dateTimeProcess, keyCode,
    });

    const responseXml = await callSoap('paymentPostpaid', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'advanceAmount', 'paymenAmount', 'unPaidAmount', 'usageAmount']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'paymentPostpaid',
        msisdn, amount, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑪ paymentPSTN — ຈ່າຍ PSTN
// ═══════════════════════════════════════════════════════════
async function paymentPSTN(pstnNumber, amount, billdate, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('PPN');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn: pstnNumber,
        dateTimeProcess, amount: String(amount), signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('paymentPSTN', {
        userID: config.userID, pstnNumber, paymentAmt: String(amount),
        transactionID, billdate: billdate || new Date().toISOString().slice(0, 7).replace('-', ''),
        dateTimeProcess, keyCode,
    });

    const responseXml = await callSoap('paymentPSTN', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'advanceAmount', 'paymentAmount', 'unPaidAmount']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'paymentPSTN',
        pstnNumber, amount, resultCode: data.resultcode, resultDes: data.resultDes,
        requestXml: xml, responseXml, status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑫ paymentInternet — ຈ່າຍ Internet
// ═══════════════════════════════════════════════════════════
async function paymentInternet(internetID, amount, billdate, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('PIN');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn: internetID,
        dateTimeProcess, amount: String(amount), signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('paymentInternet', {
        userID: config.userID, internetID, paymentAmt: String(amount),
        transactionID, billdate: billdate || new Date().toISOString().slice(0, 7).replace('-', ''),
        dateTimeProcess, keyCode,
    });

    const responseXml = await callSoap('paymentInternet', xml, config);
    const data = extractAllXmlValues(responseXml, ['resultcode', 'resultDes', 'transaction', 'advanceAmount', 'paymentAmount', 'unPaidAmount', 'usageAmount']);
    const mapped = mapResultCode(data.resultcode);

    await logTransaction({
        transactionId: transactionID, functionName: 'paymentInternet',
        internetId: internetID, amount, resultCode: data.resultcode,
        resultDes: data.resultDes, requestXml: xml, responseXml,
        status: mapped.success ? 'success' : 'failed', userId,
    });

    return { success: mapped.success, message: mapped.message, data, resultCode: data.resultcode };
}

// ═══════════════════════════════════════════════════════════
// ⑬ queryTransaction — ກວດສະຖານະ Transaction
// ═══════════════════════════════════════════════════════════
async function queryTransaction(serialNumber, msisdn, userId) {
    const config = await getConfig();
    const transactionID = generateTransactionId('QTX');
    const dateTimeProcess = formatDateTime();
    const keyCode = generateKeyCode({
        userID: config.userID, transactionID, msisdn: msisdn || '',
        dateTimeProcess, amount: '0', signKey: config.signKey, apiUrl: config.apiUrl,
    });

    const xml = buildSoapXml('queryTransaction', {
        userID: config.userID, amount: '0', msisdn: msisdn || '',
        serialNumber, transactionID, billdate: '',
        dateTimeProcess, keyCode,
    });

    const responseXml = await callSoap('queryTransaction', xml, config);
    const data = extractAllXmlValues(responseXml, [
        'resultcode', 'resultDes', 'transaction', 'amount', 'msisdn',
        'processName', 'systemTransaction', 'serialCheckingResultCode',
        'serialCheckingResultDescription',
    ]);

    return {
        success: data.serialCheckingResultCode === '405000000',
        message: data.serialCheckingResultDescription || data.resultDes,
        data,
    };
}

// ═══════════════════════════════════════════════════════════
// ⑭ smartPay — Auto query → decide → pay/topup
// ═══════════════════════════════════════════════════════════
async function smartPay({ target, amount, billdate, serviceType }, userId) {
    // serviceType: 'mobile' | 'internet' | 'pstn'
    let type = serviceType;

    // Auto-detect service type from format
    if (!type) {
        if (/^(202|302)\d+$/.test(target)) type = 'mobile';
        else if (/^(021|071)\d+$/.test(target)) type = 'pstn';
        else type = 'internet'; // ADSL/FTTH ID
    }

    if (type === 'mobile') {
        // ① Query subscriber type
        const subType = await querySubscriberType(target, userId);
        if (!subType.success) return subType;

        if (subType.data.subscriberType === '0') {
            // Prepaid → topup
            return topupPrepaid(target, amount, userId);
        } else {
            // Postpaid → payment
            return paymentPostpaid(target, amount, billdate, userId);
        }
    } else if (type === 'pstn') {
        return paymentPSTN(target, amount, billdate, userId);
    } else {
        // Internet — query payType first
        const payType = await queryInternetPayType(target, userId);
        if (!payType.success) return payType;

        if (payType.data.payType === '0') {
            return topupInternetPrepaid(target, amount, billdate, userId);
        } else {
            return paymentInternet(target, amount, billdate, userId);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════
module.exports = {
    // Core
    generateKeyCode,
    generateTransactionId,
    formatDateTime,

    // Query
    queryPrepaidBalance,
    querySubscriberType,
    queryPostPaidDebt,
    queryPSTNDebt,
    queryInternetDebt,
    queryInternetPayType,
    queryTransaction,

    // Topup
    topupPrepaid,
    topupPrepaidMasterSim,
    topupInternetPrepaid,

    // Payment
    paymentPostpaid,
    paymentPSTN,
    paymentInternet,

    // Smart
    smartPay,

    // Utils
    ETL_ERROR_CODES,
    mapResultCode,
    getConfig,
    clearConfigCache: () => { _configCache = null; _configExpiry = 0; },
};
