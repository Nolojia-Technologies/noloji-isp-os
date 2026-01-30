// Hotspot Commands - Manage hotspot users on MikroTik
import mikrotikClient, { RouterInfo, CommandResult } from './client';
import logger from '../utils/logger';

export interface HotspotUser {
    name: string;
    password: string;
    profile: string;
    limitUptime?: string;  // e.g., "1h", "1d", "30d"
    limitBytesTotal?: number;
    macAddress?: string;
    disabled?: boolean;
    comment?: string;
}

export interface HotspotProfile {
    name: string;
    rateLimit?: string;  // e.g., "2M/5M" (upload/download)
    sharedUsers?: number;
    sessionTimeout?: string;
    idleTimeout?: string;
}

/**
 * Hotspot command functions
 */
export const hotspotCommands = {
    /**
     * Create a hotspot user
     */
    async createUser(router: RouterInfo, user: HotspotUser): Promise<CommandResult> {
        const params: Record<string, string> = {
            name: user.name,
            password: user.password,
            profile: user.profile,
        };

        if (user.limitUptime) params['limit-uptime'] = user.limitUptime;
        if (user.limitBytesTotal) params['limit-bytes-total'] = user.limitBytesTotal.toString();
        if (user.macAddress) params['mac-address'] = user.macAddress;
        if (user.disabled !== undefined) params['disabled'] = user.disabled ? 'yes' : 'no';
        if (user.comment) params['comment'] = user.comment;

        logger.info(`Creating hotspot user ${user.name} on ${router.name}`);
        return mikrotikClient.execute(router, '/ip/hotspot/user/add', params);
    },

    /**
     * Update a hotspot user
     */
    async updateUser(router: RouterInfo, username: string, updates: Partial<HotspotUser>): Promise<CommandResult> {
        // First find the user
        const findResult = await mikrotikClient.execute(router, '/ip/hotspot/user/print', {
            '?name': username,
        });

        if (!findResult.success || !findResult.data?.[0]) {
            return { success: false, error: `User ${username} not found` };
        }

        const userId = findResult.data[0]['.id'];
        const params: Record<string, string> = { '.id': userId };

        if (updates.password) params['password'] = updates.password;
        if (updates.profile) params['profile'] = updates.profile;
        if (updates.limitUptime) params['limit-uptime'] = updates.limitUptime;
        if (updates.limitBytesTotal !== undefined) params['limit-bytes-total'] = updates.limitBytesTotal.toString();
        if (updates.disabled !== undefined) params['disabled'] = updates.disabled ? 'yes' : 'no';

        logger.info(`Updating hotspot user ${username} on ${router.name}`);
        return mikrotikClient.execute(router, '/ip/hotspot/user/set', params);
    },

    /**
     * Delete a hotspot user
     */
    async deleteUser(router: RouterInfo, username: string): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/ip/hotspot/user/print', {
            '?name': username,
        });

        if (!findResult.success) {
            return { success: false, error: `Failed to search for user: ${findResult.error}` };
        }

        if (!findResult.data?.[0]) {
            // User not found = already deleted, treat as success
            logger.info(`Hotspot user ${username} not found on ${router.name} (already deleted or never existed)`);
            return { success: true, data: [{ message: 'User not found on router (already deleted)' }] };
        }

        const userId = findResult.data[0]['.id'];
        logger.info(`Deleting hotspot user ${username} on ${router.name}`);
        return mikrotikClient.execute(router, '/ip/hotspot/user/remove', { '.id': userId });
    },

    /**
     * Enable/disable a hotspot user
     */
    async setUserStatus(router: RouterInfo, username: string, disabled: boolean): Promise<CommandResult> {
        return this.updateUser(router, username, { disabled });
    },

    /**
     * Disconnect an active hotspot user
     */
    async disconnectUser(router: RouterInfo, username: string): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/ip/hotspot/active/print', {
            '?user': username,
        });

        if (!findResult.success || !findResult.data?.length) {
            return { success: true, data: [] }; // User not active, nothing to disconnect
        }

        // Disconnect all active sessions for this user
        const results: CommandResult[] = [];
        for (const session of findResult.data) {
            const result = await mikrotikClient.execute(router, '/ip/hotspot/active/remove', {
                '.id': session['.id'],
            });
            results.push(result);
        }

        logger.info(`Disconnected ${findResult.data.length} session(s) for user ${username}`);
        return { success: true, data: results };
    },

    /**
     * Get active hotspot users
     */
    async getActiveUsers(router: RouterInfo): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/ip/hotspot/active/print');
    },

    /**
     * Get all hotspot users
     */
    async getAllUsers(router: RouterInfo): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/ip/hotspot/user/print');
    },

    /**
     * Create a hotspot profile
     */
    async createProfile(router: RouterInfo, profile: HotspotProfile): Promise<CommandResult> {
        const params: Record<string, string> = {
            name: profile.name,
        };

        if (profile.rateLimit) params['rate-limit'] = profile.rateLimit;
        if (profile.sharedUsers) params['shared-users'] = profile.sharedUsers.toString();
        if (profile.sessionTimeout) params['session-timeout'] = profile.sessionTimeout;
        if (profile.idleTimeout) params['idle-timeout'] = profile.idleTimeout;

        logger.info(`Creating hotspot profile ${profile.name} on ${router.name}`);
        return mikrotikClient.execute(router, '/ip/hotspot/user/profile/add', params);
    },

    /**
     * Get all hotspot profiles
     */
    async getProfiles(router: RouterInfo): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/ip/hotspot/user/profile/print');
    },

    /**
     * Update a hotspot profile
     */
    async updateProfile(router: RouterInfo, profileName: string, updates: Partial<HotspotProfile>): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/ip/hotspot/user/profile/print', {
            '?name': profileName,
        });

        if (!findResult.success || !findResult.data?.[0]) {
            return { success: false, error: `Profile ${profileName} not found` };
        }

        const profileId = findResult.data[0]['.id'];
        const params: Record<string, string> = { '.id': profileId };

        if (updates.rateLimit) params['rate-limit'] = updates.rateLimit;
        if (updates.sharedUsers) params['shared-users'] = updates.sharedUsers.toString();
        if (updates.sessionTimeout) params['session-timeout'] = updates.sessionTimeout;
        if (updates.idleTimeout) params['idle-timeout'] = updates.idleTimeout;

        logger.info(`Updating hotspot profile ${profileName} on ${router.name}`);
        return mikrotikClient.execute(router, '/ip/hotspot/user/profile/set', params);
    },
};

export default hotspotCommands;
