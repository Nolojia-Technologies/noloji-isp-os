require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { testConnection } = require('./config/database');
const RadiusServer = require('./services/radiusServer');
const SessionManager = require('./services/sessionManager');
const routes = require('./routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// ===================================
// MIDDLEWARE
// ===================================

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});

// ===================================
// ROUTES
// ===================================

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'MikroTik RADIUS Backend API',
        version: '1.0.0',
        documentation: '/api/health',
        endpoints: {
            users: '/api/users',
            vouchers: '/api/vouchers',
            plans: '/api/plans',
            sessions: '/api/sessions',
            mikrotik: '/api/mikrotik',
            radius_logs: '/api/radius/logs',
        }
    });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
});

// ===================================
// INITIALIZE SERVICES
// ===================================

let radiusServer;
let sessionManager;

async function startServices() {
    try {
        // Test database connection
        logger.info('Testing database connection...');
        const dbConnected = await testConnection();

        if (!dbConnected) {
            logger.warn('⚠️  Database connection failed - backend will run with limited functionality');
            logger.warn('⚠️  Please set up PostgreSQL and run migrations for full functionality');
            logger.warn('⚠️  RADIUS authentication and API endpoints requiring database will not work');
        } else {
            logger.info('✅ Database connected successfully');
        }

        // Start Express API server
        app.listen(PORT, HOST, () => {
            logger.info(`Express API server listening on http://${HOST}:${PORT}`);
        });

        // Start RADIUS server
        logger.info('Starting RADIUS server...');
        radiusServer = new RadiusServer();
        radiusServer.start();

        // Start Session Manager
        logger.info('Starting Session Manager...');
        sessionManager = new SessionManager();
        sessionManager.start();

        logger.info('='.repeat(50));
        logger.info('🚀 All services started successfully!');
        logger.info('='.repeat(50));
        logger.info(`API Server: http://${HOST}:${PORT}`);
        logger.info(`RADIUS Auth: UDP port ${process.env.RADIUS_PORT || 1812}`);
        logger.info(`RADIUS Acct: UDP port ${process.env.RADIUS_ACCOUNTING_PORT || 1813}`);
        logger.info('='.repeat(50));

    } catch (error) {
        logger.error('Failed to start services:', error);
        process.exit(1);
    }
}

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

function gracefulShutdown(signal) {
    logger.info(`\n${signal} received, shutting down gracefully...`);

    // Stop RADIUS server
    if (radiusServer) {
        radiusServer.stop();
    }

    // Stop Session Manager
    if (sessionManager) {
        sessionManager.stop();
    }

    // Close Express server
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ===================================
// START APPLICATION
// ===================================

startServices();
