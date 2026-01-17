const { query } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const routerMikrotikService = require('../services/routerMikrotikService');

// Get all routers
exports.getAllRouters = async (req, res) => {
    try {
        const { is_active } = req.query;

        let sql = 'SELECT * FROM routers';
        const params = [];

        if (is_active !== undefined) {
            sql += ' WHERE is_active = $1';
            params.push(is_active === 'true');
        }

        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params);

        // Get user count for each router
        for (let router of result.rows) {
            const userCount = await query(
                'SELECT COUNT(*) as count FROM users WHERE router_id = $1',
                [router.id]
            );
            router.user_count = parseInt(userCount.rows[0].count);
        }

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching routers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get router by ID
exports.getRouterById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query('SELECT * FROM routers WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Router not found' });
        }

        // Get user count for this router
        const userCount = await query(
            'SELECT COUNT(*) as count FROM users WHERE router_id = $1',
            [id]
        );

        // Get active sessions count
        const activeSessions = await query(
            'SELECT COUNT(*) as count FROM sessions WHERE is_active = true',
            []
        );

        const router = result.rows[0];
        router.user_count = parseInt(userCount.rows[0].count);
        router.active_sessions = parseInt(activeSessions.rows[0].count);

        res.json({ success: true, data: router });

    } catch (error) {
        logger.error('Error fetching router:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create new router
exports.createRouter = async (req, res) => {
    try {
        const {
            name, host, api_port, api_username, api_password,
            nas_identifier, radius_secret, location, is_active
        } = req.body;

        // Validate required fields
        if (!name || !host || !api_username || !api_password || !radius_secret) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, host, api_username, api_password, radius_secret'
            });
        }

        // Check if router with same name or host exists
        const existing = await query(
            'SELECT id FROM routers WHERE name = $1 OR host = $2',
            [name, host]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Router with this name or host already exists'
            });
        }

        // Note: Storing password in plain text for MikroTik API connection
        // TODO: Consider encryption instead of plain text for better security
        const result = await query(`
            INSERT INTO routers
            (name, host, api_port, api_username, api_password, nas_identifier,
             radius_secret, location, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            name,
            host,
            api_port || 8728,
            api_username,
            api_password, // Stored as plain text for API connection
            nas_identifier,
            radius_secret,
            location,
            is_active !== undefined ? is_active : true
        ]);

        logger.info('Router created:', { name, id: result.rows[0].id });

        res.status(201).json({
            success: true,
            message: 'Router created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error creating router:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update router
exports.updateRouter = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, host, api_port, api_username, api_password,
            nas_identifier, radius_secret, location, is_active
        } = req.body;

        // Check if router exists
        const existing = await query('SELECT * FROM routers WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Router not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (host !== undefined) {
            updates.push(`host = $${paramCount++}`);
            values.push(host);
        }
        if (api_port !== undefined) {
            updates.push(`api_port = $${paramCount++}`);
            values.push(api_port);
        }
        if (api_username !== undefined) {
            updates.push(`api_username = $${paramCount++}`);
            values.push(api_username);
        }
        if (api_password !== undefined) {
            // Store as plain text for MikroTik API connection
            updates.push(`api_password = $${paramCount++}`);
            values.push(api_password);
        }
        if (nas_identifier !== undefined) {
            updates.push(`nas_identifier = $${paramCount++}`);
            values.push(nas_identifier);
        }
        if (radius_secret !== undefined) {
            updates.push(`radius_secret = $${paramCount++}`);
            values.push(radius_secret);
        }
        if (location !== undefined) {
            updates.push(`location = $${paramCount++}`);
            values.push(location);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        values.push(id);

        const result = await query(`
            UPDATE routers
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `, values);

        logger.info('Router updated:', { id, name: result.rows[0].name });

        res.json({
            success: true,
            message: 'Router updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating router:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete router
exports.deleteRouter = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if router has users
        const userCount = await query(
            'SELECT COUNT(*) as count FROM users WHERE router_id = $1',
            [id]
        );

        if (parseInt(userCount.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete router with assigned users. Please reassign or delete users first.'
            });
        }

        const result = await query('DELETE FROM routers WHERE id = $1 RETURNING name', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Router not found' });
        }

        logger.info('Router deleted:', { id, name: result.rows[0].name });

        res.json({
            success: true,
            message: 'Router deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting router:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update router last_seen timestamp (for health monitoring)
exports.updateRouterStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const result = await query(`
            UPDATE routers
            SET last_seen = CURRENT_TIMESTAMP,
                is_active = COALESCE($1, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [is_active, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Router not found' });
        }

        res.json({
            success: true,
            message: 'Router status updated',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating router status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get MikroTik users from a specific router
exports.getMikrotikUsers = async (req, res) => {
    try {
        const { id } = req.params;

        const users = await routerMikrotikService.getAllHotspotUsers(parseInt(id));

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        logger.error('Error fetching MikroTik users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Sync users between MikroTik and database
exports.syncUsers = async (req, res) => {
    try {
        const { id } = req.params;

        const syncResult = await routerMikrotikService.syncUsersFromMikrotik(parseInt(id));

        res.json({
            success: true,
            message: 'User sync completed',
            data: syncResult
        });

    } catch (error) {
        logger.error('Error syncing users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Test connection to a specific router
exports.testConnection = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await routerMikrotikService.testRouterConnection(parseInt(id));

        // Update last_seen if connection successful
        if (result.success && result.connected) {
            await query(
                'UPDATE routers SET last_seen = CURRENT_TIMESTAMP WHERE id = $1',
                [id]
            );
        }

        res.json(result);

    } catch (error) {
        logger.error('Error testing router connection:', error);
        res.status(500).json({
            success: false,
            connected: false,
            error: error.message
        });
    }
};
