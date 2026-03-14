// utils/routeGenerator.js — Auto-load route files from src/routes/
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

// Routes that are manually mounted in index.js (special mount paths or non-standard exports).
// They must NOT be auto-loaded to prevent double mounting.
const SKIP_FILES = [
    'auth.routes.js',          // mounted at /api/auth
    'upload.routes.js',        // mounted at /api/uploads
    'collection.routes.js',    // mounted at /api/collection
    'mfi-registration.routes.js', // mounted at /api/mfi-registration
    'translations.routes.js',  // function export, needs db injection
];

exports.generateRoutes = (app, basePath = '/api') => {
    const routesDir = path.join(__dirname, '../routes');

    if (!fs.existsSync(routesDir)) {
        logger.warn('Routes directory not found', { path: routesDir });
        return;
    }

    const loadRoutes = (dir) => {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                loadRoutes(fullPath);
            } else if (file.endsWith('.js') && file !== 'index.js') {
                // Skip manually-mounted routes
                if (SKIP_FILES.includes(file)) {
                    logger.debug(`Route skipped (manual mount): ${file}`);
                    return;
                }
                try {
                    const route = require(fullPath);
                    if (typeof route === 'function' || (route && route.stack)) {
                        app.use(basePath, route);
                        logger.debug(`Route loaded: ${fullPath.replace(routesDir, '')}`);
                    }
                } catch (error) {
                    logger.error(`Failed to load route ${fullPath}`, { error: error.message });
                }
            }
        });
    };

    loadRoutes(routesDir);
};
