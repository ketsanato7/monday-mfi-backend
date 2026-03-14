#!/usr/bin/env node
/**
 * Phase 4: Add Sequelize Associations to Key Models
 * ═════════════════════════════════════════════════
 * Adds associate() static methods to models, enabling
 * Sequelize eager loading (include) and referential integrity.
 *
 * Strategy: For each model, we define the associations map,
 * then rewrite the model file to return a named variable
 * with an .associate property.
 *
 * Usage: node src/scripts/phase4_add_associations.js
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models', 'T');

// ── Association Definitions ──
// Format: { modelFile: [ { type, target, foreignKey, as } ] }
const ASSOCIATIONS = {
  // ═══ LOAN DOMAIN ═══
  'loan_contracts': [
    { type: 'belongsTo', target: 'loan_products', fk: 'product_id', as: 'product' },
    { type: 'belongsTo', target: 'currencies', fk: 'currency_id', as: 'currency' },
    { type: 'belongsTo', target: 'loan_purpose', fk: 'loan_purpose_id', as: 'loanPurpose' },
    { type: 'belongsTo', target: 'loan_classifications', fk: 'classification_id', as: 'classification' },
    { type: 'belongsTo', target: 'economic_sectors', fk: 'economic_sector_id', as: 'economicSector' },
    { type: 'belongsTo', target: 'loan_types', fk: 'loan_type_id', as: 'loanType' },
    { type: 'belongsTo', target: 'loan_terms', fk: 'loan_term_id', as: 'loanTerm' },
    { type: 'belongsTo', target: 'employees', fk: 'officer_id', as: 'officer' },
    { type: 'belongsTo', target: 'mfi_branches_info', fk: 'branch_id', as: 'branch' },
    { type: 'hasMany', target: 'loan_repayment_schedules', fk: 'contract_id', as: 'schedules' },
    { type: 'hasMany', target: 'loan_transactions', fk: 'contract_id', as: 'transactions' },
    { type: 'hasMany', target: 'loan_collaterals', fk: 'loan_id', as: 'collaterals' },
  ],
  'loan_applications': [
    { type: 'belongsTo', target: 'personal_info', fk: 'personal_info_id', as: 'personalInfo' },
    { type: 'belongsTo', target: 'enterprise_info', fk: 'enterprise_info_id', as: 'enterpriseInfo' },
    { type: 'belongsTo', target: 'loan_products', fk: 'loan_product_id', as: 'loanProduct' },
    { type: 'belongsTo', target: 'employees', fk: 'assigned_officer_id', as: 'assignedOfficer' },
  ],
  'loan_transactions': [
    { type: 'belongsTo', target: 'loan_contracts', fk: 'contract_id', as: 'contract' },
    { type: 'belongsTo', target: 'mfi_branches_info', fk: 'branch_id', as: 'branch' },
  ],
  'loan_repayment_schedules': [
    { type: 'belongsTo', target: 'loan_contracts', fk: 'contract_id', as: 'contract' },
    { type: 'belongsTo', target: 'mfi_branches_info', fk: 'branch_id', as: 'branch' },
  ],
  'loan_collaterals': [
    { type: 'belongsTo', target: 'collaterals', fk: 'collateral_id', as: 'collateral' },
  ],
  'loan_products': [
    { type: 'hasMany', target: 'loan_contracts', fk: 'product_id', as: 'contracts' },
    { type: 'hasMany', target: 'loan_applications', fk: 'loan_product_id', as: 'applications' },
  ],
  'collaterals': [
    { type: 'belongsTo', target: 'collateral_categories', fk: 'category_id', as: 'category' },
    { type: 'belongsTo', target: 'currencies', fk: 'currency_id', as: 'currency' },
    { type: 'hasMany', target: 'loan_collaterals', fk: 'collateral_id', as: 'loanLinks' },
  ],

  // ═══ DEPOSIT DOMAIN ═══
  'deposit_accounts': [
    { type: 'belongsTo', target: 'deposit_products', fk: 'product_id', as: 'product' },
    { type: 'belongsTo', target: 'currencies', fk: 'currency_id', as: 'currency' },
    { type: 'belongsTo', target: 'employees', fk: 'officer_id', as: 'officer' },
    { type: 'belongsTo', target: 'mfi_branches_info', fk: 'branch_id', as: 'branch' },
    { type: 'hasMany', target: 'deposit_transactions', fk: 'account_id', as: 'transactions' },
    { type: 'hasMany', target: 'deposit_account_owners', fk: 'account_id', as: 'owners' },
  ],
  'deposit_transactions': [
    { type: 'belongsTo', target: 'deposit_accounts', fk: 'account_id', as: 'account' },
    { type: 'belongsTo', target: 'mfi_branches_info', fk: 'branch_id', as: 'branch' },
  ],
  'deposit_account_owners': [
    { type: 'belongsTo', target: 'deposit_accounts', fk: 'account_id', as: 'account' },
    { type: 'belongsTo', target: 'personal_info', fk: 'person_id', as: 'person' },
    { type: 'belongsTo', target: 'enterprise_info', fk: 'enterprise_id', as: 'enterprise' },
  ],
  'deposit_products': [
    { type: 'hasMany', target: 'deposit_accounts', fk: 'product_id', as: 'accounts' },
  ],

  // ═══ CUSTOMER DOMAIN ═══
  'personal_info': [
    { type: 'belongsTo', target: 'genders', fk: 'gender_id', as: 'gender' },
    { type: 'belongsTo', target: 'marital_statuses', fk: 'marital_status_id', as: 'maritalStatus' },
    { type: 'belongsTo', target: 'careers', fk: 'career_id', as: 'career' },
    { type: 'belongsTo', target: 'villages', fk: 'village_id', as: 'village' },
    { type: 'belongsTo', target: 'nationality', fk: 'nationality_id', as: 'nationality' },
    { type: 'belongsTo', target: 'educations', fk: 'education_id', as: 'education' },
    { type: 'hasMany', target: 'borrowers_individual', fk: 'personal_info_id', as: 'borrowerRecords' },
    { type: 'hasMany', target: 'loan_applications', fk: 'personal_info_id', as: 'loanApplications' },
    { type: 'hasMany', target: 'deposit_account_owners', fk: 'person_id', as: 'depositAccounts' },
  ],
  'borrowers_individual': [
    { type: 'belongsTo', target: 'personal_info', fk: 'personal_info_id', as: 'personalInfo' },
    { type: 'belongsTo', target: 'genders', fk: 'gender_id', as: 'gender' },
    { type: 'belongsTo', target: 'nationality', fk: 'nationality_id', as: 'nationality' },
    { type: 'belongsTo', target: 'careers', fk: 'career_id', as: 'career' },
    { type: 'belongsTo', target: 'villages', fk: 'village_id', as: 'village' },
    { type: 'belongsTo', target: 'lao_id_cards', fk: 'card_id', as: 'idCard' },
    { type: 'belongsTo', target: 'passports', fk: 'passport_id', as: 'passport' },
    { type: 'belongsTo', target: 'family_books', fk: 'book_id', as: 'familyBook' },
  ],
  'enterprise_info': [
    { type: 'hasMany', target: 'borrowers_enterprise', fk: 'enterprise_id', as: 'borrowerRecords' },
    { type: 'hasMany', target: 'loan_applications', fk: 'enterprise_info_id', as: 'loanApplications' },
    { type: 'hasMany', target: 'deposit_account_owners', fk: 'enterprise_id', as: 'depositAccounts' },
  ],

  // ═══ SECURITY DOMAIN ═══
  'users': [
    { type: 'belongsTo', target: 'employees', fk: 'employee_id', as: 'employee' },
    { type: 'hasMany', target: 'user_roles', fk: 'user_id', as: 'userRoles' },
  ],
  'user_roles': [
    { type: 'belongsTo', target: 'users', fk: 'user_id', as: 'user' },
    { type: 'belongsTo', target: 'roles', fk: 'role_id', as: 'role' },
  ],
  'roles': [
    { type: 'hasMany', target: 'role_permissions', fk: 'role_id', as: 'permissions' },
    { type: 'hasMany', target: 'role_menus', fk: 'role_id', as: 'menus' },
    { type: 'hasMany', target: 'user_roles', fk: 'role_id', as: 'userRoles' },
  ],
  'role_permissions': [
    { type: 'belongsTo', target: 'roles', fk: 'role_id', as: 'role' },
    { type: 'belongsTo', target: 'permissions', fk: 'permission_id', as: 'permission' },
  ],
  'role_menus': [
    { type: 'belongsTo', target: 'roles', fk: 'role_id', as: 'role' },
    { type: 'belongsTo', target: 'menu_items', fk: 'menu_id', as: 'menu' },
  ],

  // ═══ HR DOMAIN ═══
  'employees': [
    { type: 'belongsTo', target: 'educations', fk: 'education_level_id', as: 'education' },
    { type: 'hasMany', target: 'users', fk: 'employee_id', as: 'userAccounts' },
  ],

  // ═══ GEO DOMAIN ═══
  'villages': [
    { type: 'belongsTo', target: 'districts', fk: 'district_id', as: 'district' },
  ],
  'districts': [
    { type: 'belongsTo', target: 'provinces', fk: 'province_id', as: 'province' },
    { type: 'hasMany', target: 'villages', fk: 'district_id', as: 'villages' },
  ],
  'provinces': [
    { type: 'hasMany', target: 'districts', fk: 'province_id', as: 'districts' },
  ],
};

// ── Stats ──
let updated = 0, skipped = 0, errors = [];

function addAssociation(modelName, associations) {
  const filePath = path.join(MODELS_DIR, `${modelName}.js`);
  if (!fs.existsSync(filePath)) {
    errors.push(`${modelName}: file not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has associate
  if (content.includes('.associate')) {
    console.log(`  ⏭  ${modelName} (already has associate)`);
    skipped++;
    return;
  }

  // Convert model: need to capture define result in a variable
  const varName = toCamelCase(modelName);

  // Build associate method code
  const assocLines = associations.map(a => {
    const method = a.type === 'belongsTo' ? 'belongsTo' : 'hasMany';
    return `        ${varName}.${method}(models.${a.target}, { foreignKey: '${a.fk}', as: '${a.as}' });`;
  }).join('\n');

  // Pattern: return sequelize.define('...', { ... }, { ... });
  const definePattern = /return\s+sequelize\.define\(/;
  if (!definePattern.test(content)) {
    errors.push(`${modelName}: unexpected model format`);
    return;
  }

  // Replace: return sequelize.define → const X = sequelize.define
  content = content.replace(
    /return\s+sequelize\.define\(/,
    `const ${varName} = sequelize.define(`
  );

  // Replace closing: }; with associate + return
  // Find the last `};` which closes the module.exports
  const lastClosing = content.lastIndexOf('};');
  if (lastClosing === -1) {
    errors.push(`${modelName}: cannot find closing '};'`);
    return;
  }

  const before = content.substring(0, lastClosing);
  const after = content.substring(lastClosing + 2);

  content = before +
    `\n    ${varName}.associate = (models) => {\n${assocLines}\n    };\n\n    return ${varName};\n};` +
    after;

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${modelName} (${associations.length} associations)`);
  updated++;
}

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase());
}

// ── Main ──
console.log('═══════════════════════════════════════════════');
console.log('  Phase 4: Sequelize Associations');
console.log('═══════════════════════════════════════════════\n');
console.log(`📁 Adding associations to ${Object.keys(ASSOCIATIONS).length} models\n`);

for (const [modelName, assocs] of Object.entries(ASSOCIATIONS)) {
  try {
    addAssociation(modelName, assocs);
  } catch (err) {
    errors.push(`${modelName}: ${err.message}`);
    console.log(`  ❌ ${modelName}: ${err.message}`);
  }
}

console.log('\n═══════════════════════════════════════════════');
console.log('  📊 Summary');
console.log('═══════════════════════════════════════════════');
console.log(`  Updated:  ${updated}`);
console.log(`  Skipped:  ${skipped}`);
console.log(`  Errors:   ${errors.length}`);
if (errors.length > 0) {
  console.log('\n  ❌ Errors:');
  errors.forEach(e => console.log(`     ${e}`));
}
console.log('');
