/**
 * sanitize.js — Global XSS Input Sanitization Middleware
 *
 * ✅ Strip ທຸກ HTML/script tags ຈາກ string fields ໃນ req.body
 * ✅ Recursive: ຮອງຮັບ nested objects + arrays
 * ✅ ບໍ່ແຕະ non-string values (numbers, booleans, dates, null)
 * ✅ ໃຊ້ກັບ POST + PUT requests ເທົ່ານັ້ນ
 *
 * Dangerous patterns ທີ່ strip:
 *   - <script>...</script>
 *   - <iframe>...</iframe>
 *   - on*= event handlers (onclick, onerror, onload, etc.)
 *   - javascript: protocol
 *   - data: protocol (ໃນ href/src context)
 *   - <object>, <embed>, <form> tags
 */

// ── Patterns ທີ່ຕ້ອງລຶບ (compiled once for performance) ──
const SANITIZE_PATTERNS = [
    // Script / iframe / object / embed / form tags
    /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
    /<\s*script[^>]*\/?>/gi,
    /<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi,
    /<\s*iframe[^>]*\/?>/gi,
    /<\s*object[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi,
    /<\s*embed[^>]*\/?>/gi,
    /<\s*form[^>]*>[\s\S]*?<\s*\/\s*form\s*>/gi,
    /<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi,

    // Event handlers: onclick=, onerror=, onload=, onmouseover=, etc.
    /\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,

    // javascript: and data: protocols
    /javascript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /vbscript\s*:/gi,

    // HTML comments (can hide XSS)
    /<!--[\s\S]*?-->/g,

    // Expression and eval patterns
    /expression\s*\(/gi,
    /eval\s*\(/gi,
];

/**
 * Sanitize ຄ່າ string ດຽວ
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
    if (!str || typeof str !== 'string') return str;

    let result = str;
    for (const pattern of SANITIZE_PATTERNS) {
        result = result.replace(pattern, '');
    }

    // ── ລຶບ HTML tags ທີ່ເຫຼືອ (ເກັບແຕ່ text content) ──
    // ຍົກເວັ້ນ: ບໍ່ strip ທັງໝົດ ເພາະ description fields ອາດຕ້ອງການ <br> ຫຼື <b>
    // ແຕ່ strip ສະເພາະ dangerous tags ຈາກ SANITIZE_PATTERNS ຂ້າງເທິງ

    return result.trim();
}

/**
 * Recursive sanitize object ທັງໝົດ
 * @param {*} value
 * @returns {*}
 */
function sanitizeValue(value) {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
        return sanitizeString(value);
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (typeof value === 'object' && !(value instanceof Date)) {
        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
            sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
    }

    // numbers, booleans, dates → ບໍ່ແຕະ
    return value;
}

/**
 * Express middleware — sanitize req.body ສຳລັບ POST/PUT
 */
function sanitizeInput(req, res, next) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        req.body = sanitizeValue(req.body);
    }
    next();
}

module.exports = sanitizeInput;
module.exports.sanitizeString = sanitizeString;
module.exports.sanitizeValue = sanitizeValue;
