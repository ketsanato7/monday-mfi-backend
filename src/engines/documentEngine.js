/**
 * documentEngine.js — Template Engine for Printable Documents
 * 
 * Renders HTML templates with data from the database.
 * All documents follow BoL/AML compliance requirements.
 */
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '../templates');

/**
 * Render a template with data
 * @param {string} templateName - Template filename (without .html)
 * @param {Object} data - Data to inject
 * @returns {string} Rendered HTML
 */
function renderTemplate(templateName, data = {}) {
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templateName}`);
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(flattenObject(data))) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        html = html.replace(regex, value ?? '');
    }

    // Remove any unreplaced placeholders
    html = html.replace(/\{\{[^}]+\}\}/g, '');

    return html;
}

/**
 * Flatten nested object for template replacement
 * e.g. { person: { name: 'A' } } → { 'person.name': 'A' }
 */
function flattenObject(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            Object.assign(result, flattenObject(value, fullKey));
        } else {
            result[fullKey] = value !== null && value !== undefined ? String(value) : '';
        }
    }
    return result;
}

/**
 * Format LAK currency
 */
function formatLAK(amount) {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 0 }) + ' ₭';
}

/**
 * Format date to Lao format
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Number to Lao text (simplified)
 */
function numberToLaoText(num) {
    const n = parseInt(num) || 0;
    if (n === 0) return 'ສູນ';
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const units = ['', 'ໜຶ່ງ', 'ສອງ', 'ສາມ', 'ສີ່', 'ຫ້າ', 'ຫົກ', 'ເຈັດ', 'ແປດ', 'ເກົ້າ'];
    let text = '';
    if (millions > 0) text += `${millions} ລ້ານ `;
    if (thousands > 0) text += `${thousands} ພັນ `;
    text += 'ກີບ';
    return text.trim();
}

module.exports = {
    renderTemplate,
    formatLAK,
    formatDate,
    numberToLaoText,
    TEMPLATES_DIR,
};
