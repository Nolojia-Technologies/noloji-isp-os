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

            // Also sync customer online status
            await this.syncCustomerOnlineStatus(routers);
        } catch (error: any) {
            logger.error('Failed to check routers', { error: error.message });
        }
    },

    /**
     * Sync customer online status from all routers
     */
    async syncCustomerOnlineStatus(routers: any[]): Promise<void> {
        try {
            const { hotspotCommands, pppoeCommands } = await import('../mikrotik');
            const { getSupabase } = await import('./database');
            const supabase = getSupabase();

            const activeUsernames = new Set<string>();

            for (const router of routers) {
                if (!router.is_active) continue;

                const routerInfo = {
                    id: router.id,
                    name: router.name,
                    host: router.host,
                    api_port: router.api_port,
                    api_username: router.api_username,
                    api_password: router.api_password,
                    use_ssl: router.use_ssl,
                    role: router.role,
                };

                // Get hotspot active users
                try {
                    const hotspotResult = await hotspotCommands.getActiveUsers(routerInfo);
                    if (hotspotResult.success && hotspotResult.data) {
                        hotspotResult.data.forEach((user: any) => {
                            if (user.user) activeUsernames.add(user.user);
                        });
                    }
                } catch (e) {
                    // Hotspot not configured
                }

                // Get PPPoE active sessions
                try {
                    const pppoeResult = await pppoeCommands.getActiveSessions(routerInfo);
                    if (pppoeResult.success && pppoeResult.data) {
                        pppoeResult.data.forEach((session: any) => {
                            if (session.name) activeUsernames.add(session.name);
                        });
                    }
                } catch (e) {
                    // PPPoE not configured
                }
            }

            // Update all customers to offline first
            await supabase
                .from('customers')
                .update({ is_online: false })
                .neq('id', 0);

            // Update active users to online
            if (activeUsernames.size > 0) {
                await supabase
                    .from('customers')
                    .update({ is_online: true })
                    .in('username', Array.from(activeUsernames));

                logger.debug(`Synced ${activeUsernames.size} active users to online`);
            }
        } catch (error: any) {
            logger.warn('Failed to sync customer online status', { error: error.message });
        }
    },

    /**
     * Check a single router
     */
    async checkRouter(router: any): Promise<void> {
        // For RADIUS mode routers, check based on last heartbeat
        if (router.connection_mode === 'radius') {
            await this.checkRadiusModeRouter(router);
            return;
        }

        // For API mode routers, connect directly
        try {
            const routerInfo: RouterInfo = {
                id: router.id,
                name: router.name,
                host: router.host,
                api_port: router.api_port,
                api_username: router.api_username,
                api_password: router.api_password,
                use_ssl: router.use_ssl,
                role: router.role
            };

            const resources = await mikrotikClient.getSystemResources(routerInfo);

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

    /**
     * Check a RADIUS mode router based on last heartbeat
     */
    async checkRadiusModeRouter(router: any): Promise<void> {
        const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without heartbeat = offline

        const lastHeartbeat = router.last_heartbeat
            ? new Date(router.last_heartbeat).getTime()
            : 0;

        const timeSinceHeartbeat = Date.now() - lastHeartbeat;

        if (lastHeartbeat === 0) {
            // Never received a heartbeat - mark as waiting for setup
            await db.updateRouterHealth(router.id, { status: 'offline' });
            logger.debug(`Router ${router.name} (RADIUS mode): Waiting for first heartbeat`);
        } else if (timeSinceHeartbeat > OFFLINE_THRESHOLD_MS) {
            // Heartbeat too old
            await db.updateRouterHealth(router.id, { status: 'offline' });
            logger.warn(`Router ${router.name} (RADIUS mode): No heartbeat for ${Math.round(timeSinceHeartbeat / 1000)}s - marking offline`);
        } else {
            // Recent heartbeat - router is online (status already updated by heartbeat callback)
            logger.debug(`Router ${router.name} (RADIUS mode): Last heartbeat ${Math.round(timeSinceHeartbeat / 1000)}s ago`);
        }
    },
};

export default healthMonitor;
