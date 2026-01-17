// Profile Sync Service - Sync packages to MikroTik router profiles
import { db, Router, Plan } from './database';
import { hotspotCommands, pppoeCommands, RouterInfo } from '../mikrotik';
import logger from '../utils/logger';
import { billingEnforcement } from './billing-enforcement';
import { getSupabase } from './database';

export interface SyncResult {
    success: boolean;
    planId: number;
    routerId?: number;
    profileName: string;
    error?: string;
}

/**
 * Convert speed in Kbps to MikroTik rate limit format
 * e.g., 2048 Kbps -> "2M", 512 Kbps -> "512k"
 */
function formatRateLimit(uploadKbps: number, downloadKbps: number): string {
    const formatSpeed = (kbps: number): string => {
        if (kbps >= 1024) {
            return `${Math.floor(kbps / 1024)}M`;
        }
        return `${kbps}k`;
    };
    return `${formatSpeed(uploadKbps)}/${formatSpeed(downloadKbps)}`;
}

/**
 * Generate profile name from plan name
 */
function generateProfileName(planName: string): string {
    return `plan-${planName.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Profile Sync Service
 */
export const profileSync = {
    /**
     * Sync a plan's profile to all online routers
     */
    async syncPlanToAllRouters(planId: number): Promise<SyncResult[]> {
        logger.info(`Syncing plan ${planId} to all routers`);

        const results: SyncResult[] = [];

        try {
            // Get the plan
            const plan = await this.getPlanById(planId);
            if (!plan) {
                return [{ success: false, planId, profileName: '', error: 'Plan not found' }];
            }

            // Get all online routers
            const routers = await db.getRouters();
            const onlineRouters = routers.filter(r => r.status === 'online');

            if (onlineRouters.length === 0) {
                logger.warn('No online routers to sync to');
                return [{ success: false, planId, profileName: generateProfileName(plan.name), error: 'No online routers available' }];
            }

            // Sync to each router
            for (const router of onlineRouters) {
                const result = await this.syncPlanToRouter(plan, router);
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            logger.info(`Synced plan ${planId} to ${successCount}/${onlineRouters.length} routers`);

        } catch (error: any) {
            logger.error(`Failed to sync plan ${planId}`, { error: error.message });
            results.push({ success: false, planId, profileName: '', error: error.message });
        }

        return results;
    },

    /**
     * Sync a plan's profile to a specific router
     */
    async syncPlanToRouter(plan: Plan, router: Router): Promise<SyncResult> {
        const profileName = generateProfileName(plan.name);
        const rateLimit = formatRateLimit(plan.upload_speed || 1024, plan.download_speed || 2048);

        logger.info(`Syncing profile ${profileName} (${rateLimit}) to router ${router.name}`);

        try {
            const routerInfo = billingEnforcement.toRouterInfo(router);

            // Sync based on router role
            if (router.role === 'hotspot' || router.role === 'edge') {
                await this.upsertHotspotProfile(routerInfo, profileName, {
                    rateLimit,
                    sessionTimeout: plan.session_timeout ? `${plan.session_timeout}s` : undefined,
                });
            }

            if (router.role === 'pppoe' || router.role === 'edge') {
                await this.upsertPPPoEProfile(routerInfo, profileName, {
                    rateLimit,
                });
            }

            // Update sync status in database
            await this.updateSyncStatus(plan.id, router.id, profileName);

            return { success: true, planId: plan.id, routerId: router.id, profileName };

        } catch (error: any) {
            logger.error(`Failed to sync ${profileName} to ${router.name}`, { error: error.message });
            return { success: false, planId: plan.id, routerId: router.id, profileName, error: error.message };
        }
    },

    /**
     * Sync all plans to a specific router (useful when router comes online)
     */
    async syncAllPlansToRouter(routerId: number): Promise<SyncResult[]> {
        logger.info(`Syncing all plans to router ${routerId}`);

        const results: SyncResult[] = [];

        try {
            const router = await db.getRouterById(routerId);
            if (!router) {
                return [{ success: false, planId: 0, profileName: '', error: 'Router not found' }];
            }

            const plans = await this.getPlans();

            for (const plan of plans) {
                const result = await this.syncPlanToRouter(plan, router);
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            logger.info(`Synced ${successCount}/${plans.length} plans to router ${routerId}`);

        } catch (error: any) {
            logger.error(`Failed to sync plans to router ${routerId}`, { error: error.message });
        }

        return results;
    },

    /**
     * Upsert (create or update) a hotspot profile on router
     */
    async upsertHotspotProfile(router: RouterInfo, profileName: string, config: { rateLimit: string; sessionTimeout?: string }) {
        // Check if profile exists
        const existingResult = await hotspotCommands.getProfiles(router);
        const existingProfile = existingResult.data?.find((p: any) => p.name === profileName);

        if (existingProfile) {
            // Update existing profile
            logger.info(`Updating existing hotspot profile ${profileName}`);
            await hotspotCommands.updateProfile(router, profileName, {
                rateLimit: config.rateLimit,
                sessionTimeout: config.sessionTimeout,
            });
        } else {
            // Create new profile
            logger.info(`Creating new hotspot profile ${profileName}`);
            await hotspotCommands.createProfile(router, {
                name: profileName,
                rateLimit: config.rateLimit,
                sessionTimeout: config.sessionTimeout,
            });
        }
    },

    /**
     * Upsert (create or update) a PPPoE profile on router
     */
    async upsertPPPoEProfile(router: RouterInfo, profileName: string, config: { rateLimit: string }) {
        // Check if profile exists
        const existingResult = await pppoeCommands.getProfiles(router);
        const existingProfile = existingResult.data?.find((p: any) => p.name === profileName);

        if (existingProfile) {
            // Update existing profile
            logger.info(`Updating existing PPPoE profile ${profileName}`);
            await pppoeCommands.updateProfile(router, profileName, {
                rateLimit: config.rateLimit,
            });
        } else {
            // Create new profile
            logger.info(`Creating new PPPoE profile ${profileName}`);
            await pppoeCommands.createProfile(router, {
                name: profileName,
                rateLimit: config.rateLimit,
            });
        }
    },

    /**
     * Get plan by ID
     */
    async getPlanById(id: number): Promise<Plan | null> {
        const { data, error } = await getSupabase()
            .from('plans')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Get all active plans
     */
    async getPlans(): Promise<Plan[]> {
        const { data, error } = await getSupabase()
            .from('plans')
            .select('*')
            .eq('is_active', true);

        if (error) return [];
        return data || [];
    },

    /**
     * Update sync status in database
     */
    async updateSyncStatus(planId: number, routerId: number, profileName: string): Promise<void> {
        try {
            // Update pppoe_profiles sync status
            await getSupabase()
                .from('pppoe_profiles')
                .update({ synced_at: new Date().toISOString(), router_id: routerId })
                .eq('plan_id', planId);

            // Update hotspot_profiles sync status
            await getSupabase()
                .from('hotspot_profiles')
                .update({ synced_at: new Date().toISOString(), router_id: routerId })
                .eq('plan_id', planId);

        } catch (error) {
            logger.warn('Failed to update sync status in database', { error });
        }
    },
};

export default profileSync;
