// config/database.js
module.exports = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'test1',
    port: process.env.DB_PORT || 5432
};
