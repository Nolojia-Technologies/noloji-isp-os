// Health Monitor Service - Periodic router health checks
import { db } from './database';
import { mikrotikClient, RouterInfo } from '../mikrotik';
import logger from '../utils/logger';
import config from '../config';

let healthCheckInterval: NodeJS.Timeout | null = null;

/**
 * Health Monitor Service
 * Performs periodic health checks on all registered routers
 */
export const healthMonitor = {
    /**
     * Start periodic health checks
     */
    start(): void {
        if (healthCheckInterval) {
            logger.warn('Health monitor already running');
            return;
        }

        logger.info('Starting health monitor');

        // Run immediately on start
        this.checkAllRouters();

        // Schedule periodic checks
        healthCheckInterval = setInterval(() => {
            this.checkAllRouters();
        }, config.mikrotik.healthCheckInterval);
    },

    /**
     * Stop health checks
     */
    stop(): void {
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
            logger.info('Health monitor stopped');
        }
    },

    /**
     * Check all active routers
     */
    async checkAllRouters(): Promise<void> {
        try {
            const routers = await db.getRouters();
            logger.info(`Checking health of ${routers.length} router(s)`);

            for (const router of routers) {
                await this.checkRouter(router as unknown as RouterInfo);
            }
        } catch (error: any) {
            logger.error('Failed to check routers', { error: error.message });
        }
    },

    /**
     * Check a single router
     */
    async checkRouter(router: RouterInfo): Promise<void> {
        try {
            const resources = await mikrotikClient.getSystemResources(router);

            if (resources) {
                const memoryPercent = Math.round(
                    ((resources.totalMemory - resources.freeMemory) / resources.totalMemory) * 100
                );

                // Determine status based on metrics
                let status: 'online' | 'offline' | 'degraded' = 'online';
                if (resources.cpuLoad > 90 || memoryPercent > 90) {
                    status = 'degraded';
                }

                await db.updateRouterHealth(router.id, {
                    status,
                    cpu_usage: resources.cpuLoad,
                    memory_usage: memoryPercent,
                    uptime: resources.uptime,
                });

                logger.debug(`Router ${router.name}: CPU ${resources.cpuLoad}%, Memory ${memoryPercent}%`);
            } else {
                await db.updateRouterHealth(router.id, { status: 'offline' });
                logger.warn(`Router ${router.name} is offline`);
            }
        } catch (error: any) {
            // If API connection fails, check if we've had recent RADIUS activity (heartbeat)
            // If the router updated its status recently (e.g. via RADIUS Acct), don't mark it offline yet.
            const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

            // We need to fetch the fresh router record to check last_health_check
            const freshRouter = await db.getRouterById(router.id);

            let shouldMarkOffline = true;
            if (freshRouter && freshRouter.last_health_check) {
                const lastCheck = new Date(freshRouter.last_health_check).getTime();
                if (Date.now() - lastCheck < OFFLINE_THRESHOLD_MS) {
                    shouldMarkOffline = false;
                    logger.debug(`Router ${router.name} API failed, but has recent activity (${Math.round((Date.now() - lastCheck) / 1000)}s ago). Keeping Online.`);
                }
            }

            if (shouldMarkOffline) {
                await db.updateRouterHealth(router.id, { status: 'offline' });
                logger.error(`Health check failed for ${router.name}`, { error: error.message });
            }
        }
    },
};

export default healthMonitor;
