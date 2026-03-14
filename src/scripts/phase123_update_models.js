#!/usr/bin/env node
/**
 * Phase 1+2+3: Batch Update All Sequelize Models
 * ────────────────────────────────────────────────
 * Phase 1: Add timestamps (created_at, updated_at)
 * Phase 2: Add soft delete (deleted_at + paranoid)
 * Phase 3: Add audit fields (created_by, updated_by)
 *
 * Usage: node src/scripts/phase123_update_models.js
 * 
 * This script reads every .js file in models/T/,
 * analyses it, and rewrites it with compliant fields.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models', 'T');

// ── Models that are VIEWs (read-only) — skip ──
const SKIP_MODELS = new Set([
  'v_borrower_loans',  // SQL VIEW
]);

// ── Stats ──
const stats = {
  total: 0,
  skipped: 0,
  phase1_timestamps: 0,
  phase2_softdelete: 0,
  phase3_auditfields: 0,
  already_compliant: 0,
  errors: [],
};

function processModel(filePath) {
  const fileName = path.basename(filePath, '.js');
  stats.total++;

  if (SKIP_MODELS.has(fileName)) {
    stats.skipped++;
    console.log(`  ⏭  ${fileName} (VIEW — skipped)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // ─── Phase 1: Fix timestamps ───
  const hasTimestampsFalse = content.includes('timestamps: false');
  const hasCreatedAt = content.includes('created_at');
  const hasUpdatedAt = content.includes('updated_at');

  if (hasTimestampsFalse) {
    // Model has timestamps: false — need to add columns + enable
    // Add created_at and updated_at columns before the closing }, {
    const defineEndRegex = /(\s*)(}\s*,\s*\{[^}]*timestamps:\s*false[^}]*\}\s*\)\s*;)/;
    const match = content.match(defineEndRegex);

    if (match) {
      // Find position to insert columns: before the last }, { ...
      // Strategy: add columns before closing, then fix options
      
      // First add the columns if not present
      if (!hasCreatedAt) {
        const lastColumnRegex = /([ \t]+\w+:\s*\{[^}]+\})(,?\s*\n\s*}\s*,\s*\{)/;
        const colMatch = content.match(lastColumnRegex);
        if (colMatch) {
          const indent = '        ';
          const newCols = `,\n${indent}// ═══ Audit Fields (AML/CFT ມ.20) ═══\n${indent}created_at: { type: DataTypes.DATE },\n${indent}updated_at: { type: DataTypes.DATE }`;
          content = content.replace(lastColumnRegex, `$1${newCols}$2`);
        }
      }

      // Fix timestamps option
      content = content.replace(
        /timestamps:\s*false/,
        "createdAt: 'created_at', updatedAt: 'updated_at'"
      );
      stats.phase1_timestamps++;
      modified = true;
    }
  } else if (hasCreatedAt && !hasTimestampsFalse) {
    // Already has timestamps with mapping — OK
  }

  // Re-read (content may have changed)
  // ─── Phase 2: Add soft delete (deleted_at + paranoid) ───
  const hasDeletedAt = content.includes('deleted_at');
  if (!hasDeletedAt) {
    // Add deleted_at column before the closing }, {
    const optionsRegex = /([ \t]+)(}\s*,\s*\{[^}]*\}\s*\)\s*;)/;
    const optMatch = content.match(optionsRegex);
    if (optMatch) {
      const indent = optMatch[1] || '        ';
      // Add deleted_at column before options block
      content = content.replace(
        optionsRegex,
        `${indent}// ═══ Soft Delete (AML/CFT ມ.20) ═══\n${indent}deleted_at: { type: DataTypes.DATE },\n${indent}$2`
      );
    }
    stats.phase2_softdelete++;
    modified = true;
  }

  // Add paranoid: true to options if not present
  const hasParanoid = content.includes('paranoid');
  if (!hasParanoid) {
    // Add paranoid + deletedAt mapping to the options object
    const closingBrace = /(\}\s*\)\s*;)\s*$/;
    // Find the options: { tableName: '...', ... }
    if (content.includes("createdAt: 'created_at'")) {
      content = content.replace(
        /createdAt:\s*'created_at',\s*updatedAt:\s*'updated_at'/,
        "createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at'"
      );
    } else {
      // Has tableName but no timestamp mapping — add it
      content = content.replace(
        /tableName:\s*'([^']+)'/,
        "tableName: '$1', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at'"
      );
    }
    modified = true;
  }

  // ─── Phase 3: Add created_by / updated_by ───
  const hasCreatedBy = content.includes('created_by');
  if (!hasCreatedBy) {
    // Add created_by and updated_by before deleted_at or before closing }, {
    const insertBefore = content.includes('deleted_at:')
      ? /([ \t]+)(\/\/\s*═══\s*Soft Delete|deleted_at:\s*\{)/
      : /([ \t]+)(}\s*,\s*\{)/;

    const auditMatch = content.match(insertBefore);
    if (auditMatch) {
      const indent = auditMatch[1] || '        ';
      const auditFields = `${indent}// ═══ Audit Trail (AML/CFT ມ.22) ═══\n${indent}created_by: { type: DataTypes.INTEGER },\n${indent}updated_by: { type: DataTypes.INTEGER },\n`;
      content = content.replace(insertBefore, `${auditFields}${auditMatch[1]}$2`);
    }
    stats.phase3_auditfields++;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ ${fileName}`);
  } else {
    stats.already_compliant++;
    console.log(`  ✔  ${fileName} (already compliant)`);
  }
}

// ── Main ──
console.log('═══════════════════════════════════════════════');
console.log('  Phase 1+2+3: Database Compliance Update');
console.log('═══════════════════════════════════════════════\n');

const files = fs.readdirSync(MODELS_DIR)
  .filter(f => f.endsWith('.js'))
  .sort();

console.log(`📁 Found ${files.length} model files\n`);

for (const file of files) {
  try {
    processModel(path.join(MODELS_DIR, file));
  } catch (err) {
    stats.errors.push({ file, error: err.message });
    console.log(`  ❌ ${file}: ${err.message}`);
  }
}

console.log('\n═══════════════════════════════════════════════');
console.log('  📊 Summary');
console.log('═══════════════════════════════════════════════');
console.log(`  Total models:        ${stats.total}`);
console.log(`  Skipped (views):     ${stats.skipped}`);
console.log(`  Phase 1 (timestamps):${stats.phase1_timestamps}`);
console.log(`  Phase 2 (soft del):  ${stats.phase2_softdelete}`);
console.log(`  Phase 3 (audit):     ${stats.phase3_auditfields}`);
console.log(`  Already compliant:   ${stats.already_compliant}`);
console.log(`  Errors:              ${stats.errors.length}`);
if (stats.errors.length > 0) {
  console.log('\n  ❌ Errors:');
  stats.errors.forEach(e => console.log(`     ${e.file}: ${e.error}`));
}
console.log('');
