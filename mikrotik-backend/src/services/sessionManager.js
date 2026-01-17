const cron = require('node-cron');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const MikroTikAPI = require('./mikrotikApi');

class SessionManager {
    constructor() {
        this.cleanupInterval = parseInt(process.env.SESSION_CLEANUP_INTERVAL || '300'); // 5 minutes
        this.cronJob = null;
        this.mikrotik = null;
    }

    // Start session management service
    start() {
        logger.info('Starting Session Manager...');

        // Initialize MikroTik API
        this.mikrotik = new MikroTikAPI();

        // Run cleanup every N seconds (convert to cron format)
        // For simplicity, we'll run every 5 minutes
        this.cronJob = cron.schedule('*/5 * * * *', async () => {
            await this.performCleanup();
        });

        logger.info('Session Manager started - cleanup runs every 5 minutes');

        // Run initial cleanup
        this.performCleanup();
    }

    // Stop session manager
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            logger.info('Session Manager stopped');
        }
    }

    // Perform cleanup tasks
    async performCleanup() {
        logger.debug('Running session cleanup...');

        try {
            await this.disconnectExpiredUsers();
            await this.cleanupStaleSessions();
            await this.processDisconnectionQueue();
            await this.checkDataLimits();
        } catch (error) {
            logger.error('Session cleanup error:', error);
        }
    }

    // Disconnect users with expired accounts
    async disconnectExpiredUsers() {
        try {
            // Find users whose accounts have expired but are still online
            const result = await query(`
                SELECT u.id, u.username, u.valid_until
                FROM users u
                WHERE u.is_online = true
                  AND u.valid_until IS NOT NULL
                  AND u.valid_until < NOW()
            `);

            if (result.rows.length > 0) {
                logger.info(`Found ${result.rows.length} expired users to disconnect`);

                for (const user of result.rows) {
                    await this.queueUserDisconnection(user.id, user.username, 'Account expired');
                }
            }

        } catch (error) {
            logger.error('Error disconnecting expired users:', error);
        }
    }

    // Check and disconnect users who exceeded data limits
    async checkDataLimits() {
        try {
            // Find users who exceeded their data limit
            const result = await query(`
                SELECT u.id, u.username, u.total_data_used_mb, p.data_limit_mb
                FROM users u
                INNER JOIN plans p ON u.plan_id = p.id
                WHERE u.is_online = true
                  AND p.data_limit_mb IS NOT NULL
                  AND u.total_data_used_mb >= p.data_limit_mb
            `);

            if (result.rows.length > 0) {
                logger.info(`Found ${result.rows.length} users who exceeded data limit`);

                for (const user of result.rows) {
                    await this.queueUserDisconnection(
                        user.id,
                        user.username,
                        `Data limit exceeded (${user.total_data_used_mb}MB / ${user.data_limit_mb}MB)`
                    );
                }
            }

        } catch (error) {
            logger.error('Error checking data limits:', error);
        }
    }

    // Clean up stale sessions (sessions that haven't updated in a while)
    async cleanupStaleSessions() {
        try {
            const staleMinutes = 30; // Consider sessions stale after 30 minutes of no updates

            const result = await query(`
                UPDATE sessions
                SET status = 'timeout',
                    stop_time = NOW()
                WHERE status = 'active'
                  AND last_update < NOW() - INTERVAL '${staleMinutes} minutes'
                RETURNING username, session_id
            `);

            if (result.rows.length > 0) {
                logger.info(`Cleaned up ${result.rows.length} stale sessions`);

                // Update user online status
                for (const session of result.rows) {
                    await query(`
                        UPDATE users
                        SET is_online = false
                        WHERE username = $1
                          AND NOT EXISTS (
                              SELECT 1 FROM sessions
                              WHERE username = $1 AND status = 'active'
                          )
                    `, [session.username]);
                }
            }

        } catch (error) {
            logger.error('Error cleaning up stale sessions:', error);
        }
    }

    // Queue a user for disconnection
    async queueUserDisconnection(userId, username, reason) {
        try {
            // Check if already queued
            const existing = await query(
                `SELECT id FROM disconnection_queue
                 WHERE username = $1 AND status IN ('pending', 'processing')`,
                [username]
            );

            if (existing.rows.length > 0) {
                logger.debug(`User ${username} already in disconnection queue`);
                return;
            }

            // Add to queue
            await query(
                `INSERT INTO disconnection_queue (user_id, username, reason, status)
                 VALUES ($1, $2, $3, 'pending')`,
                [userId, username, reason]
            );

            logger.info(`Queued user ${username} for disconnection: ${reason}`);

        } catch (error) {
            logger.error('Error queueing user disconnection:', error);
        }
    }

    // Process disconnection queue
    async processDisconnectionQueue() {
        try {
            // Get pending disconnections
            const result = await query(`
                SELECT id, user_id, username, reason, retry_count
                FROM disconnection_queue
                WHERE status = 'pending'
                  AND retry_count < 3
                ORDER BY scheduled_at
                LIMIT 10
            `);

            if (result.rows.length === 0) {
                return;
            }

            logger.info(`Processing ${result.rows.length} disconnection requests`);

            for (const item of result.rows) {
                await this.processDisconnection(item);
            }

        } catch (error) {
            logger.error('Error processing disconnection queue:', error);
        }
    }

    // Process individual disconnection
    async processDisconnection(item) {
        try {
            // Mark as processing
            await query(
                `UPDATE disconnection_queue
                 SET status = 'processing'
                 WHERE id = $1`,
                [item.id]
            );

            // Attempt to disconnect via MikroTik API
            const result = await this.mikrotik.disconnectHotspotUser(item.username);

            if (result.success) {
                // Mark as completed
                await query(
                    `UPDATE disconnection_queue
                     SET status = 'completed',
                         processed_at = NOW()
                     WHERE id = $1`,
                    [item.id]
                );

                // Update user online status
                await query(
                    'UPDATE users SET is_online = false WHERE id = $1',
                    [item.user_id]
                );

                logger.info(`Successfully disconnected user ${item.username}: ${item.reason}`);

            } else {
                // Retry
                await query(
                    `UPDATE disconnection_queue
                     SET status = 'pending',
                         retry_count = retry_count + 1,
                         error_message = $1
                     WHERE id = $2`,
                    [result.message, item.id]
                );

                logger.warn(`Failed to disconnect user ${item.username}: ${result.message}`);
            }

        } catch (error) {
            // Mark as failed
            await query(
                `UPDATE disconnection_queue
                 SET status = 'failed',
                     error_message = $1,
                     retry_count = retry_count + 1
                 WHERE id = $2`,
                [error.message, item.id]
            );

            logger.error(`Error disconnecting user ${item.username}:`, error);
        }
    }

    // Manual disconnect user
    async disconnectUser(username, reason = 'Manual disconnect') {
        try {
            // Get user info
            const result = await query(
                'SELECT id, username, is_online FROM users WHERE username = $1',
                [username]
            );

            if (result.rows.length === 0) {
                return { success: false, message: 'User not found' };
            }

            const user = result.rows[0];

            if (!user.is_online) {
                return { success: false, message: 'User is not online' };
            }

            // Try immediate disconnection
            const mikrotikResult = await this.mikrotik.disconnectHotspotUser(username);

            if (mikrotikResult.success) {
                // Update user status
                await query('UPDATE users SET is_online = false WHERE id = $1', [user.id]);

                // Close active sessions
                await query(
                    `UPDATE sessions
                     SET status = 'stopped',
                         stop_time = NOW(),
                         terminate_cause = $1
                     WHERE username = $2 AND status = 'active'`,
                    [reason, username]
                );

                return {
                    success: true,
                    message: `User ${username} disconnected successfully`
                };
            } else {
                // Queue for retry
                await this.queueUserDisconnection(user.id, username, reason);

                return {
                    success: false,
                    message: 'Disconnection queued for retry'
                };
            }

        } catch (error) {
            logger.error('Error in manual disconnect:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Get active sessions count
    async getActiveSessionsCount() {
        try {
            const result = await query(
                "SELECT COUNT(*) as count FROM sessions WHERE status = 'active'"
            );
            return parseInt(result.rows[0].count);
        } catch (error) {
            logger.error('Error getting active sessions count:', error);
            return 0;
        }
    }

    // Get session statistics
    async getSessionStats() {
        try {
            const result = await query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'active') as active,
                    COUNT(*) FILTER (WHERE status = 'stopped') as stopped,
                    COUNT(*) FILTER (WHERE status = 'timeout') as timeout,
                    COUNT(*) as total,
                    SUM(session_duration) as total_duration,
                    SUM(input_octets + output_octets) as total_bytes
                FROM sessions
                WHERE start_time > NOW() - INTERVAL '24 hours'
            `);

            return result.rows[0];
        } catch (error) {
            logger.error('Error getting session stats:', error);
            return null;
        }
    }
}

module.exports = SessionManager;
