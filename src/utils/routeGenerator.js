// utils/routeGenerator.js — Auto-load route files from src/routes/
const fs = require('fs');
const path = require('path');

exports.generateRoutes = (app, basePath = '/api') => {
    const routesDir = path.join(__dirname, '../routes');

    if (!fs.existsSync(routesDir)) {
        console.warn('⚠️ Routes directory not found:', routesDir);
        return;
    }

    const loadRoutes = (dir) => {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                loadRoutes(fullPath);
            } else if (file.endsWith('.js') && file !== 'index.js') {
                try {
                    const route = require(fullPath);
                    if (typeof route === 'function' || (route && route.stack)) {
                        app.use(basePath, route);
                        console.log(`✅ Route loaded: ${fullPath.replace(routesDir, '')}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to load route ${fullPath}:`, error.message);
                }
            }
        });
    };

    loadRoutes(routesDir);
};
