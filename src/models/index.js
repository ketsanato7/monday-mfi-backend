/**
 * models/index.js — Auto-load all Sequelize models from subdirectories
 *
 * Scans A/, T/, D/ directories for model files and registers them.
 * Each model file exports: (sequelize, DataTypes) => sequelize.define(...)
 */
const logger = require('../config/logger');
const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

// ===== Database Connection =====
const dbConfig = require('../config/database');

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.user,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: 'postgres',
        logging: false,
        define: {
            freezeTableName: true,
        },
    }
);

const db = {};

// ===== Auto-load model files from subdirectories =====
const modelDirs = ['A', 'T', 'D'].map(d => path.join(__dirname, d)).filter(d => fs.existsSync(d));

for (const dir of modelDirs) {
    fs.readdirSync(dir)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            try {
                const modelDefiner = require(path.join(dir, file));
                if (typeof modelDefiner === 'function') {
                    const model = modelDefiner(sequelize, DataTypes);
                    db[model.name || model.tableName] = model;
                }
            } catch (err) {
                logger.error(`⚠️ Failed to load model ${file}:`, err.message);
            }
        });
}

// ===== Also load any .js model files in the root models/ directory =====
fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'index.js')
    .forEach(file => {
        try {
            const modelDefiner = require(path.join(__dirname, file));
            if (typeof modelDefiner === 'function') {
                const model = modelDefiner(sequelize, DataTypes);
                db[model.name || model.tableName] = model;
            }
        } catch (err) {
            logger.error(`⚠️ Failed to load model ${file}:`, err.message);
        }
    });

// ===== Associate models (if associate method exists) =====
Object.entries(db).forEach(([name, model]) => {
    if (model.associate) {
        try {
            model.associate(db);
        } catch (err) {
            logger.warn(`⚠️ Association failed for ${name}: ${err.message}`);
        }
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Test connection
sequelize.authenticate()
    .then(() => logger.info(`✅ Database connected: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`))
    .catch(err => logger.error('❌ Database connection error:', err.message));

logger.info(`📦 Loaded ${Object.keys(db).length - 2} models`); // -2 for sequelize and Sequelize

module.exports = db;
