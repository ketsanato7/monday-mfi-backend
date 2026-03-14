#!/usr/bin/env node
/**
 * Phase 6: Replace console.log/error/warn → Winston logger
 * ═══════════════════════════════════════════════════════
 * Batch replaces all console.* calls with structured logger calls.
 * Adds `const logger = require(...)` import at top of each file.
 *
 * Usage: node src/scripts/phase6_replace_console_log.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('path');

// Directories to process
const SCAN_DIRS = [
    path.join(__dirname, '..', 'routes'),
    path.join(__dirname, '..', 'services'),
    path.join(__dirname, '..', 'middleware'),
    path.join(__dirname, '..', 'models'),
    path.join(__dirname, '..', 'config'),
];

let updated = 0, skipped = 0, totalReplacements = 0;

function getRelativeLoggerPath(filePath) {
    const fileDir = path.dirname(filePath);
    const loggerPath = path.join(__dirname, '..', 'config', 'logger');
    let rel = path.relative(fileDir, loggerPath).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return rel;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Skip index.js in models (handled separately)
    const basename = path.basename(filePath);
    if (basename === 'logger.js') return;

    let replacements = 0;

    // Replace console.log → logger.info
    content = content.replace(/console\.log\s*\(/g, () => {
        replacements++;
        return 'logger.info(';
    });

    // Replace console.error → logger.error
    content = content.replace(/console\.error\s*\(/g, () => {
        replacements++;
        return 'logger.error(';
    });

    // Replace console.warn → logger.warn
    content = content.replace(/console\.warn\s*\(/g, () => {
        replacements++;
        return 'logger.warn(';
    });

    if (replacements === 0) {
        skipped++;
        return;
    }

    // Add logger import if not already present
    if (!content.includes("require") || (!content.includes("config/logger") && !content.includes("logger = require"))) {
        const loggerPath = getRelativeLoggerPath(filePath);
        // Add after first require or at top
        const firstRequire = content.indexOf("require(");
        if (firstRequire > -1) {
            // Find the line start of the first require
            const lineStart = content.lastIndexOf('\n', firstRequire);
            const insertPos = lineStart > -1 ? lineStart + 1 : 0;
            content = content.slice(0, insertPos) + `const logger = require('${loggerPath}');\n` + content.slice(insertPos);
        } else {
            content = `const logger = require('${loggerPath}');\n` + content;
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    const relPath = path.relative(path.join(__dirname, '../..'), filePath);
    console.log(`  ✅ ${relPath} (${replacements} replacements)`);
    updated++;
    totalReplacements += replacements;
}

function scanDir(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.name.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

// ── Main ──
console.log('═══════════════════════════════════════════════');
console.log('  Phase 6: Replace console.log → Winston');
console.log('═══════════════════════════════════════════════\n');

for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) {
        console.log(`📁 Scanning ${path.basename(dir)}/`);
        scanDir(dir);
    }
}

console.log('\n═══════════════════════════════════════════════');
console.log('  📊 Summary');
console.log('═══════════════════════════════════════════════');
console.log(`  Files updated:     ${updated}`);
console.log(`  Files skipped:     ${skipped}`);
console.log(`  Total replacements: ${totalReplacements}`);
console.log('');
