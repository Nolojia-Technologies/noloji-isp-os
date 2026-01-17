require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || `postgres://postgres:${process.env.DB_PASSWORD}@localhost:5432/${process.env.DB_NAME}`
    });

    try {
        console.log('Connecting to database...');

        // Get migration file from command line or use default
        const migrationFile = process.argv[2] || '001_add_customer_features.sql';

        // Read migration file
        const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationFile}`);
            process.exit(1);
        }

        const migration = fs.readFileSync(migrationPath, 'utf8');

        console.log(`Running migration: ${migrationFile}`);

        // Execute migration
        await pool.query(migration);

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
