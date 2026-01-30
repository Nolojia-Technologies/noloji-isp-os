// Billing Enforcement Service - Handles subscription events
import { db, Customer, Router, Plan } from './database';
import { hotspotCommands, pppoeCommands, queueCommands, RouterInfo } from '../mikrotik';
import logger from '../utils/logger';
import { decrypt } from '../utils/encryption';

export interface EnforcementResult {
    success: boolean;
    action: string;
    customerId: number;
    error?: string;
}

/**
 * Billing Enforcement Service
 * Automatically enforces billing actions on MikroTik routers
 */
export const billingEnforcement = {
    /**
     * Suspend a customer (disable access)
     */
    async suspendCustomer(customerId: number): Promise<EnforcementResult> {
        logger.info(`Suspending customer ${customerId}`);

        try {
            const details = await db.getCustomerWithDetails(customerId);
            if (!details) {
                return { success: false, action: 'suspend', customerId, error: 'Customer not found' };
            }

            const { customer, router } = details;
            if (!router) {
                return { success: false, action: 'suspend', customerId, error: 'No router assigned' };
            }

            const routerInfo = this.toRouterInfo(router);

            // Disable user based on connection type
            const connType = customer.connection_type?.toUpperCase();
            if (connType === 'HOTSPOT') {
                await hotspotCommands.setUserStatus(routerInfo, customer.username, true);
                await hotspotCommands.disconnectUser(routerInfo, customer.username);
            } else if (connType === 'PPPOE') {
                await pppoeCommands.setSecretStatus(routerInfo, customer.username, true);
                await pppoeCommands.disconnectSession(routerInfo, customer.username);
            }

            // Disable queue if exists
            await queueCommands.setQueueStatus(routerInfo, `queue-${customer.username}`, true);

            logger.info(`Successfully suspended customer ${customerId}`);
            return { success: true, action: 'suspend', customerId };
        } catch (error: any) {
            logger.error(`Failed to suspend customer ${customerId}`, { error: error.message });
            return { success: false, action: 'suspend', customerId, error: error.message };
        }
    },
    /**
     * Activate a customer (enable access)
     * For imported customers: enables their existing MikroTik account
     * For new customers with plans: provisions them if needed, then enables
     */
    async activateCustomer(customerId: number): Promise<EnforcementResult> {
        logger.info(`Activating customer ${customerId}`);

        try {
            const details = await db.getCustomerWithDetails(customerId);
            if (!details) {
                return { success: false, action: 'activate', customerId, error: 'Customer not found' };
            }

            const { customer, plan, router } = details;
            if (!router) {
                return { success: false, action: 'activate', customerId, error: 'No router assigned' };
            }

            const routerInfo = this.toRouterInfo(router);
            const connType = customer.connection_type?.toUpperCase();

            // Check if user exists on MikroTik
            let userExists = false;
            try {
                if (connType === 'HOTSPOT') {
                    const result = await hotspotCommands.getAllUsers(routerInfo);
                    if (result.success && result.data) {
                        userExists = result.data.some((u: any) => u.name === customer.username);
                    }
                } else if (connType === 'PPPOE') {
                    const result = await pppoeCommands.getAllSecrets(routerInfo);
                    if (result.success && result.data) {
                        userExists = result.data.some((s: any) => s.name === customer.username);
                    }
                }
            } catch (e: any) {
                logger.warn(`Could not check if user exists on router: ${e.message}`);
            }

            // If user doesn't exist on MikroTik and we have a plan, provision them first
            if (!userExists && plan) {
                logger.info(`User ${customer.username} not found on router, provisioning first`);
                const provisionResult = await this.provisionCustomer(customerId);
                if (!provisionResult.success) {
                    return provisionResult;
                }
            } else if (!userExists && !plan) {
                // User doesn't exist and no plan assigned - can't do anything
                return { success: false, action: 'activate', customerId, error: 'Customer has no plan assigned and does not exist on router' };
            }

            // Enable user based on connection type
            if (connType === 'HOTSPOT') {
                await hotspotCommands.setUserStatus(routerInfo, customer.username, false);
            } else if (connType === 'PPPOE') {
                await pppoeCommands.setSecretStatus(routerInfo, customer.username, false);
            }

            // Enable queue if exists (don't fail if queue doesn't exist)
            try {
                await queueCommands.setQueueStatus(routerInfo, `queue-${customer.username}`, false);
            } catch (e) {
                // Queue might not exist
            }

            logger.info(`Successfully activated customer ${customerId}`);
            return { success: true, action: 'activate', customerId };
        } catch (error: any) {
            logger.error(`Failed to activate customer ${customerId}`, { error: error.message });
            return { success: false, action: 'activate', customerId, error: error.message };
        }
    },

    /**
     * Change customer speed (package upgrade/downgrade)
     */
    async changeSpeed(customerId: number, newPlanId: number): Promise<EnforcementResult> {
        logger.info(`Changing speed for customer ${customerId} to plan ${newPlanId}`);

        try {
            const details = await db.getCustomerWithDetails(customerId);
            if (!details) {
                return { success: false, action: 'speed_change', customerId, error: 'Customer not found' };
            }

            const { customer, router } = details;
            if (!router) {
                return { success: false, action: 'speed_change', customerId, error: 'No router assigned' };
            }

            // Get new plan details
            const { data: newPlan } = await (await import('./database')).getSupabase()
                .from('plans')
                .select('*')
                .eq('id', newPlanId)
                .single();

            if (!newPlan) {
                return { success: false, action: 'speed_change', customerId, error: 'Plan not found' };
            }

            const routerInfo = this.toRouterInfo(router);
            const uploadMbps = Math.floor(newPlan.upload_speed / 1024);
            const downloadMbps = Math.floor(newPlan.download_speed / 1024);

            // Update queue speed
            await queueCommands.updateSpeedLimit(
                routerInfo,
                `queue-${customer.username}`,
                uploadMbps,
                downloadMbps
            );

            // If using profiles, update the profile assignment
            const profileName = `plan-${newPlan.name.toLowerCase().replace(/\s+/g, '-')}`;

            const connType = customer.connection_type?.toUpperCase();
            if (connType === 'HOTSPOT') {
                await hotspotCommands.updateUser(routerInfo, customer.username, { profile: profileName });
            } else if (connType === 'PPPOE') {
                await pppoeCommands.updateSecret(routerInfo, customer.username, { profile: profileName });
            }

            logger.info(`Successfully changed speed for customer ${customerId}`);
            return { success: true, action: 'speed_change', customerId };
        } catch (error: any) {
            logger.error(`Failed to change speed for customer ${customerId}`, { error: error.message });
            return { success: false, action: 'speed_change', customerId, error: error.message };
        }
    },

    /**
     * Provision a new customer on their assigned router
     */
    async provisionCustomer(customerId: number): Promise<EnforcementResult> {
        logger.info(`Provisioning customer ${customerId}`);

        try {
            const details = await db.getCustomerWithDetails(customerId);
            if (!details) {
                return { success: false, action: 'provision', customerId, error: 'Customer not found' };
            }

            const { customer, plan, router } = details;
            if (!router || !plan) {
                return { success: false, action: 'provision', customerId, error: 'Missing router or plan' };
            }

            const routerInfo = this.toRouterInfo(router);
            const profileName = `plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`;

            // Create user based on connection type
            const connType = customer.connection_type?.toUpperCase();
            if (connType === 'HOTSPOT') {
                await hotspotCommands.createUser(routerInfo, {
                    name: customer.username,
                    password: customer.password,
                    profile: profileName,
                    comment: `Managed by Nolojia Billing - ID:${customerId}`,
                });
            } else if (connType === 'PPPOE') {
                await pppoeCommands.createSecret(routerInfo, {
                    name: customer.username,
                    password: customer.password,
                    profile: profileName,
                    comment: `Managed by Nolojia Billing - ID:${customerId}`,
                });
            }

            logger.info(`Successfully provisioned customer ${customerId}`);
            return { success: true, action: 'provision', customerId };
        } catch (error: any) {
            logger.error(`Failed to provision customer ${customerId}`, { error: error.message });
            return { success: false, action: 'provision', customerId, error: error.message };
        }
    },

    /**
     * Process all expired subscriptions
     */
    async processExpiredSubscriptions(): Promise<EnforcementResult[]> {
        logger.info('Processing expired subscriptions');

        const expiredCustomers = await db.getExpiredCustomers();
        const results: EnforcementResult[] = [];

        for (const customer of expiredCustomers) {
            const result = await this.suspendCustomer(customer.id);
            results.push(result);
        }

        logger.info(`Processed ${results.length} expired subscriptions`);
        return results;
    },

    /**
     * Convert database router to RouterInfo
     */
    toRouterInfo(router: Router): RouterInfo {
        return {
            id: router.id,
            name: router.name,
            host: router.host,
            api_port: router.api_port,
            api_username: router.api_username,
            api_password: router.api_password,
            use_ssl: router.use_ssl,
            role: router.role,
        };
    },
};

export default billingEnforcement;
