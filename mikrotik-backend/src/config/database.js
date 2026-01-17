const { Pool } = require('pg');
const logger = require('../utils/logger');

// Parse DATABASE_URL or use individual environment variables
function getDatabaseConfig() {
    // If DATABASE_URL is provided, use it
    if (process.env.DATABASE_URL) {
        logger.info('Using DATABASE_URL for database connection');
        return {
            connectionString: process.env.DATABASE_URL,
            min: parseInt(process.env.DB_POOL_MIN || '2'),
            max: parseInt(process.env.DB_POOL_MAX || '10'),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        };
    }

    // Otherwise, use individual environment variables
    logger.info('Using individual DB_* variables for database connection');
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'wifi_billing',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        max: parseInt(process.env.DB_POOL_MAX || '10'),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
}

// Database connection pool configuration
const pool = new Pool(getDatabaseConfig());

// Test database connection
pool.on('connect', () => {
    logger.info('Database connection established');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
    process.exit(-1);
});

// Query helper with error handling
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        logger.error('Query error:', { text, error: error.message });
        throw error;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Test connection function
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW()');
        logger.info('Database connection test successful:', result.rows[0]);
        return true;
    } catch (error) {
        logger.error('Database connection test failed:', error.message);
        return false;
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection,
};
