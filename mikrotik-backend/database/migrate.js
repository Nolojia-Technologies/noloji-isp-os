require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Use DATABASE_URL if available, otherwise use individual variables
const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'wifi_billing',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
    };

const pool = new Pool(poolConfig);

async function migrate() {
    console.log('🚀 Starting database migration...');

    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📖 Reading schema.sql...');

        // Execute schema
        await pool.query(schema);

        console.log('✅ Database migration completed successfully!');
        console.log('📊 Tables created:');
        console.log('   - routers');
        console.log('   - plans');
        console.log('   - users');
        console.log('   - vouchers');
        console.log('   - sessions');
        console.log('   - radius_logs');
        console.log('   - bandwidth_usage');
        console.log('   - disconnection_queue');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
