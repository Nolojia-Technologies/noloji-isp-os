// Configuration module for MikroTik Service
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3002', 10),

    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    },

    // Redis
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    // Encryption
    encryptionKey: process.env.ENCRYPTION_KEY || '',

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',

    // MikroTik defaults
    mikrotik: {
        defaultApiPort: 8728,
        defaultApiSslPort: 8729,
        connectionTimeout: 30000, // 30 seconds
        commandTimeout: 60000, // 60 seconds
        healthCheckInterval: 60000, // 1 minute
    },

    // Job queue
    jobs: {
        maxRetries: 3,
        retryDelay: 5000, // 5 seconds
    },
};

export default config;
