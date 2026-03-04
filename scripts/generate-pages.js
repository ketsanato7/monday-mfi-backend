/**
 * generate-pages.js — Auto-generate CrudPage frontend pages from frontend-blueprint.json
 *
 * Reads the blueprint and generates page_auto/[ModelName]Page/index.tsx for every table.
 * Also updates baseApi.ts with new tag types.
 *
 * Run: node scripts/generate-pages.js
 */
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(BACKEND_DIR, '..', 'web-admin', 'src');
const PAGES_DIR = path.join(FRONTEND_DIR, 'pages', 'page_auto');
const BLUEPRINT_PATH = path.join(BACKEND_DIR, 'frontend-blueprint.json');
const BASE_API_PATH = path.join(FRONTEND_DIR, 'api', 'baseApi.ts');

// ═══ Tables to skip (already have custom pages) ═══
const SKIP_TABLES = new Set([
    'personal_info',  // PersonalInfoPage already exists
    '_careers',        // CareersPage already exists (but careers without _ is OK)
]);

// ═══ Color palette for page headers ═══
const COLOR_PALETTES = {
    // Dictionary / reference tables
    dictionary: ['#00695c', '#26a69a'],
    // Loan-related
    loan: ['#1a237e', '#3949ab'],
    // Deposit-related
    deposit: ['#0d47a1', '#1976d2'],
    // Accounting
    accounting: ['#4a148c', '#7b1fa2'],
    // Enterprise/Organization
    enterprise: ['#e65100', '#f57c00'],
    // Employee/HR
    employee: ['#1b5e20', '#388e3c'],
    // Personal info
    personal: ['#283593', '#5c6bc0'],
    // System/Admin
    system: ['#37474f', '#607d8b'],
    // Default
    default: ['#1a237e', '#3949ab'],
};

function getColorPalette(tableName) {
    if (tableName.match(/loan|borrower|collateral|credit/)) return COLOR_PALETTES.loan;
    if (tableName.match(/deposit/)) return COLOR_PALETTES.deposit;
    if (tableName.match(/journal|chart_of_accounts|trial_balance|ledger|fiscal|financial|gl_|ecl_|exchange/)) return COLOR_PALETTES.accounting;
    if (tableName.match(/enterprise|org/)) return COLOR_PALETTES.enterprise;
    if (tableName.match(/employee|payroll|training|staff|employment/)) return COLOR_PALETTES.employee;
    if (tableName.match(/personal|address|family|marriage|lao_id|passport|contact/)) return COLOR_PALETTES.personal;
    if (tableName.match(/user|role|permission|menu|audit|notification/)) return COLOR_PALETTES.system;
    if (tableName.match(/gender|career|marital|nationality|country|province|district|village|education|currency|categor|type|size|sector|branch|unit|purpose|term|classification|funding/)) return COLOR_PALETTES.dictionary;
    return COLOR_PALETTES.default;
}

// ═══ Helper: Convert table_name to PascalCase ═══
function toPascalCase(str) {
    return str.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
}

// ═══ Helper: Map blueprint form field type to CrudFormDialog type ═══
function mapFieldType(type) {
    switch (type) {
        case 'text': return 'text';
        case 'number': return 'number';
        case 'select': return 'select';
        case 'date': return 'date';
        case 'datetime': return 'date';
        case 'textarea': return 'textarea';
        case 'checkbox': return 'text'; // CrudFormDialog doesn't have checkbox yet
        case 'json': return 'textarea';
        default: return 'text';
    }
}

// ═══ Helper: Generate gridSize for form field ═══
function getGridSize(field) {
    if (field.type === 'textarea' || field.type === 'json') return 12;
    return 6;
}

// ═══ MAIN: Generate page file for a table ═══
function generatePageFile(tableName, blueprint) {
    const modelName = blueprint.modelName;
    const tagName = modelName + 'Auto';
    const colors = getColorPalette(tableName);

    // Filter columns — skip PK id and keep max 8 visible columns for DataGrid
    const gridColumns = (blueprint.gridColumns || [])
        .filter(col => !col.isPk) // hide ID column
        .slice(0, 8) // max 8 columns visible
        .map(col => {
            const colDef = {
                field: col.field,
                headerName: col.headerName,
            };
            if (col.type === 'number') {
                colDef.width = col.width || 120;
            } else if (col.type === 'date' || col.type === 'dateTime') {
                colDef.width = col.width || 130;
            } else {
                colDef.flex = 1;
            }
            return colDef;
        });

    // Map form fields
    const formFields = (blueprint.formFields || []).map(f => {
        const field = {
            name: f.name,
            label: f.label,
        };
        const type = mapFieldType(f.type);
        if (type !== 'text') field.type = type;
        if (f.required) field.required = true;
        const gridSize = getGridSize(f);
        if (gridSize === 12) field.gridSize = 12;
        return field;
    });

    // Determine dialog size based on field count
    let dialogMaxWidth = 'md';
    if (formFields.length <= 3) dialogMaxWidth = 'sm';
    else if (formFields.length > 15) dialogMaxWidth = 'lg';

    // Generate title from table name
    const title = tableName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    // Build the TSX content
    const columnsJson = JSON.stringify(gridColumns, null, 12)
        .replace(/\n/g, '\n        '); // fix indentation

    const fieldsJson = JSON.stringify(formFields, null, 12)
        .replace(/\n/g, '\n        ');

    const content = `/**
 * ${modelName}Page — Auto-generated CRUD Page
 * Table: ${tableName}
 */
import CrudPage from "../CrudPage";
import type { CrudPageConfig } from "../CrudPage";
import { createCrudApi } from "../createCrudApi";

// ─── API Hooks ─── //
const api = createCrudApi({
    tableName: "${tableName}",
    tagName: "${tagName}",
});

const useGetAll = (api as any).useGetAll${tagName}Query;
const useCreate = (api as any).useCreate${tagName}Mutation;
const useUpdate = (api as any).useUpdate${tagName}Mutation;
const useDelete = (api as any).useDelete${tagName}Mutation;

// ─── Config ─── //
const config: CrudPageConfig = {
    title: "${title}",
    headerColors: ${JSON.stringify(colors)},
    columns: ${columnsJson},
    formFields: ${fieldsJson},
    useGetAll,
    useCreate,
    useUpdate,
    useDelete,
    dialogMaxWidth: "${dialogMaxWidth}",
};

// ─── Page ─── //
export default function ${modelName}Page() {
    return <CrudPage config={config} />;
}
`;

    return content;
}

// ═══ Generate route index for all auto pages ═══
function generateAutoRouteIndex(tables) {
    const imports = [];
    const routes = [];

    for (const { tableName, modelName } of tables) {
        imports.push(`import ${modelName}Page from "./${modelName}Page";`);
        routes.push(`    { path: "${tableName}", element: <${modelName}Page /> },`);
    }

    return `/**
 * Auto-generated route index for all CRUD pages
 * Generated at: ${new Date().toISOString()}
 */
${imports.join('\n')}

export const autoRoutes = [
${routes.join('\n')}
];

export const autoPageMap: Record<string, { component: React.ComponentType; title: string }> = {
${tables.map(t => `    "${t.tableName}": { component: ${t.modelName}Page, title: "${t.title}" },`).join('\n')}
};
`;
}

// ═══ MAIN ═══
function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  🎨 Frontend Page Generator');
    console.log('═══════════════════════════════════════════════');

    // 1. Read blueprint
    if (!fs.existsSync(BLUEPRINT_PATH)) {
        console.error('❌ frontend-blueprint.json not found! Run pipeline.js first.');
        process.exit(1);
    }

    const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8'));
    const tableNames = Object.keys(blueprint);
    console.log(`📋 Found ${tableNames.length} tables in blueprint`);

    // 2. Generate pages
    let generated = 0;
    let skipped = 0;
    const generatedTables = [];

    for (const tableName of tableNames) {
        const info = blueprint[tableName];

        // Skip tables that already have custom pages
        if (SKIP_TABLES.has(tableName)) {
            console.log(`   ⏭️  Skip: ${tableName} (custom page exists)`);
            skipped++;
            continue;
        }

        const modelName = info.modelName || toPascalCase(tableName);
        const pageDir = path.join(PAGES_DIR, `${modelName}Page`);
        const pagePath = path.join(pageDir, 'index.tsx');

        // Skip if page already exists
        if (fs.existsSync(pagePath)) {
            console.log(`   ⏭️  Skip: ${modelName}Page (already exists)`);
            skipped++;
            continue;
        }

        // Generate
        fs.mkdirSync(pageDir, { recursive: true });
        const content = generatePageFile(tableName, info);
        fs.writeFileSync(pagePath, content);
        generated++;

        const title = tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        generatedTables.push({ tableName, modelName, title });
    }

    // 3. Generate auto route index
    const routeIndexPath = path.join(PAGES_DIR, 'autoRoutes.tsx');
    fs.writeFileSync(routeIndexPath, generateAutoRouteIndex(generatedTables));

    // 4. Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log(`  ✅ Generated: ${generated} pages`);
    console.log(`  ⏭️  Skipped:   ${skipped} pages`);
    console.log(`  📁 Location:  web-admin/src/pages/page_auto/`);
    console.log(`  🗺️  Routes:    page_auto/autoRoutes.tsx`);
    console.log('═══════════════════════════════════════════════');
}

main();
