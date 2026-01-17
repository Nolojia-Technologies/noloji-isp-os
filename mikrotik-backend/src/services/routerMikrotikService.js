const MikroTikAPI = require('./mikrotikApi');
const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

/**
 * Service to manage MikroTik operations for specific routers from database
 */
class RouterMikroTikService {

    /**
     * Get router configuration by ID
     */
    async getRouterConfig(routerId) {
        const result = await query(
            'SELECT * FROM routers WHERE id = $1 AND is_active = true',
            [routerId]
        );

        if (result.rows.length === 0) {
            throw new Error('Router not found or not active');
        }

        return result.rows[0];
    }

    /**
     * Create MikroTik API instance for specific router
     */
    async getMikrotikInstance(routerId) {
        const router = await this.getRouterConfig(routerId);

        // Password is now stored as plain text in the database
        return new MikroTikAPI({
            host: router.host,
            port: router.api_port || 8728,
            username: router.api_username,
            password: router.api_password,
            timeout: 5000
        });
    }

    /**
     * Create hotspot user on specific router
     */
    async createHotspotUser(routerId, username, password, profile = 'default', planName = '') {
        try {
            const mikrotik = await this.getMikrotikInstance(routerId);
            const comment = `${planName ? `Plan: ${planName} | ` : ''}Created via Noloji System`;

            const result = await mikrotik.createHotspotUser(username, password, profile, comment);

            await mikrotik.disconnect();

            logger.info('User created in MikroTik:', { routerId, username });
            return result;
        } catch (error) {
            logger.error('Error creating user in MikroTik:', { routerId, username, error: error.message });
            // Don't throw - allow user creation to succeed even if MikroTik fails
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove hotspot user from specific router
     */
    async removeHotspotUser(routerId, username) {
        try {
            const mikrotik = await this.getMikrotikInstance(routerId);
            const result = await mikrotik.removeHotspotUser(username);
            await mikrotik.disconnect();

            logger.info('User removed from MikroTik:', { routerId, username });
            return result;
        } catch (error) {
            logger.error('Error removing user from MikroTik:', { routerId, username, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all hotspot users from specific router
     */
    async getAllHotspotUsers(routerId) {
        try {
            const mikrotik = await this.getMikrotikInstance(routerId);
            const users = await mikrotik.getAllHotspotUsers();
            await mikrotik.disconnect();

            return users;
        } catch (error) {
            logger.error('Error fetching users from MikroTik:', { routerId, error: error.message });
            return [];
        }
    }

    /**
     * Sync users from MikroTik to database
     */
    async syncUsersFromMikrotik(routerId) {
        try {
            const mikrotikUsers = await this.getAllHotspotUsers(routerId);
            const dbUsers = await query(
                'SELECT username FROM users WHERE router_id = $1',
                [routerId]
            );

            const dbUsernames = new Set(dbUsers.rows.map(u => u.username));
            const mikrotikUsernames = new Set(mikrotikUsers.map(u => u.name));

            // Find users in MikroTik but not in DB
            const newUsers = mikrotikUsers.filter(u => !dbUsernames.has(u.name));

            // Find users in DB but not in MikroTik
            const missingInMikrotik = dbUsers.rows.filter(u => !mikrotikUsernames.has(u.username));

            return {
                success: true,
                mikrotikUsers: mikrotikUsers.length,
                dbUsers: dbUsers.rows.length,
                newUsers: newUsers.length,
                missingInMikrotik: missingInMikrotik.length,
                details: {
                    newUsers: newUsers.map(u => u.name),
                    missingInMikrotik: missingInMikrotik.map(u => u.username)
                }
            };
        } catch (error) {
            logger.error('Error syncing users from MikroTik:', { routerId, error: error.message });
            throw error;
        }
    }

    /**
     * Test connection to router
     */
    async testRouterConnection(routerId) {
        try {
            const mikrotik = await this.getMikrotikInstance(routerId);
            const result = await mikrotik.testConnection();
            await mikrotik.disconnect();
            return result;
        } catch (error) {
            return {
                success: false,
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Add bandwidth queue for user
     */
    async addUserQueue(routerId, username, uploadSpeed, downloadSpeed, ipAddress) {
        try {
            const mikrotik = await this.getMikrotikInstance(routerId);

            // Convert from Mbps to Kbps for MikroTik
            const uploadKbps = uploadSpeed * 1024;
            const downloadKbps = downloadSpeed * 1024;

            const result = await mikrotik.addSimpleQueue(
                `queue-${username}`,
                ipAddress,
                uploadKbps,
                downloadKbps,
                `User: ${username}`
            );

            await mikrotik.disconnect();
            return result;
        } catch (error) {
            logger.error('Error adding queue for user:', { routerId, username, error: error.message });
            return { success: false, error: error.message };
        }
    }
}

module.exports = new RouterMikroTikService();
