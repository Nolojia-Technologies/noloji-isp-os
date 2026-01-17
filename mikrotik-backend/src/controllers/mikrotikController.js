const MikroTikAPI = require('../services/mikrotikApi');
const logger = require('../utils/logger');

// Create MikroTik API instance
const mikrotik = new MikroTikAPI();

// Test connection to MikroTik router
exports.testConnection = async (req, res) => {
    try {
        const result = await mikrotik.testConnection();

        res.json(result);

    } catch (error) {
        logger.error('Error testing MikroTik connection:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get system resources
exports.getSystemResources = async (req, res) => {
    try {
        const resources = await mikrotik.getSystemResources();

        res.json({
            success: true,
            data: resources
        });

    } catch (error) {
        logger.error('Error fetching system resources:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get active hotspot users
exports.getActiveHotspotUsers = async (req, res) => {
    try {
        const users = await mikrotik.getActiveHotspotUsers();

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        logger.error('Error fetching active hotspot users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Disconnect hotspot user
exports.disconnectUser = async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }

        const result = await mikrotik.disconnectHotspotUser(username);

        res.json(result);

    } catch (error) {
        logger.error('Error disconnecting user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Disconnect by MAC address
exports.disconnectByMac = async (req, res) => {
    try {
        const { mac } = req.params;

        if (!mac) {
            return res.status(400).json({
                success: false,
                error: 'MAC address is required'
            });
        }

        const result = await mikrotik.disconnectByMac(mac);

        res.json(result);

    } catch (error) {
        logger.error('Error disconnecting by MAC:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Create hotspot user
exports.createHotspotUser = async (req, res) => {
    try {
        const { username, password, profile, comment } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        const result = await mikrotik.createHotspotUser(
            username,
            password,
            profile || 'default',
            comment
        );

        res.status(201).json(result);

    } catch (error) {
        logger.error('Error creating hotspot user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Remove hotspot user
exports.removeHotspotUser = async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }

        const result = await mikrotik.removeHotspotUser(username);

        res.json(result);

    } catch (error) {
        logger.error('Error removing hotspot user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get all hotspot users
exports.getAllHotspotUsers = async (req, res) => {
    try {
        const users = await mikrotik.getAllHotspotUsers();

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        logger.error('Error fetching hotspot users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Add simple queue
exports.addSimpleQueue = async (req, res) => {
    try {
        const { name, target, upload_limit, download_limit, comment } = req.body;

        if (!name || !target || !upload_limit || !download_limit) {
            return res.status(400).json({
                success: false,
                error: 'name, target, upload_limit, and download_limit are required'
            });
        }

        const result = await mikrotik.addSimpleQueue(
            name,
            target,
            upload_limit,
            download_limit,
            comment
        );

        res.status(201).json(result);

    } catch (error) {
        logger.error('Error adding simple queue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update simple queue
exports.updateSimpleQueue = async (req, res) => {
    try {
        const { name } = req.params;
        const { upload_limit, download_limit } = req.body;

        if (!upload_limit || !download_limit) {
            return res.status(400).json({
                success: false,
                error: 'upload_limit and download_limit are required'
            });
        }

        const result = await mikrotik.updateSimpleQueue(
            name,
            upload_limit,
            download_limit
        );

        res.json(result);

    } catch (error) {
        logger.error('Error updating simple queue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Remove simple queue
exports.removeSimpleQueue = async (req, res) => {
    try {
        const { name } = req.params;

        const result = await mikrotik.removeSimpleQueue(name);

        res.json(result);

    } catch (error) {
        logger.error('Error removing simple queue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get all simple queues
exports.getAllSimpleQueues = async (req, res) => {
    try {
        const queues = await mikrotik.getAllSimpleQueues();

        res.json({
            success: true,
            count: queues.length,
            data: queues
        });

    } catch (error) {
        logger.error('Error fetching simple queues:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get interface statistics
exports.getInterfaceStats = async (req, res) => {
    try {
        const interfaces = await mikrotik.getInterfaceStats();

        res.json({
            success: true,
            count: interfaces.length,
            data: interfaces
        });

    } catch (error) {
        logger.error('Error fetching interface stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Check RADIUS configuration
exports.checkRadiusConfig = async (req, res) => {
    try {
        const config = await mikrotik.checkRadiusConfig();

        res.json({
            success: true,
            data: config
        });

    } catch (error) {
        logger.error('Error checking RADIUS config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
