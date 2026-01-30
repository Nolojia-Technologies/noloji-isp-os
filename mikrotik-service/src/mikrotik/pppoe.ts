// PPPoE Commands - Manage PPPoE secrets on MikroTik
import mikrotikClient, { RouterInfo, CommandResult } from './client';
import logger from '../utils/logger';

export interface PPPoESecret {
    name: string;
    password: string;
    profile: string;
    service?: string;
    localAddress?: string;
    remoteAddress?: string;
    disabled?: boolean;
    comment?: string;
}

export interface PPPoEProfile {
    name: string;
    localAddress?: string;
    remoteAddress?: string;  // Pool name
    rateLimit?: string;  // e.g., "2M/5M"
    onlyOne?: boolean;
    bridgeLearning?: string;
}

/**
 * PPPoE command functions
 */
export const pppoeCommands = {
    /**
     * Create a PPPoE secret
     */
    async createSecret(router: RouterInfo, secret: PPPoESecret): Promise<CommandResult> {
        const params: Record<string, string> = {
            name: secret.name,
            password: secret.password,
            profile: secret.profile,
            service: secret.service || 'pppoe',
        };

        if (secret.localAddress) params['local-address'] = secret.localAddress;
        if (secret.remoteAddress) params['remote-address'] = secret.remoteAddress;
        if (secret.disabled !== undefined) params['disabled'] = secret.disabled ? 'yes' : 'no';
        if (secret.comment) params['comment'] = secret.comment;

        logger.info(`Creating PPPoE secret ${secret.name} on ${router.name}`);
        return mikrotikClient.execute(router, '/ppp/secret/add', params);
    },

    /**
     * Update a PPPoE secret
     */
    async updateSecret(router: RouterInfo, username: string, updates: Partial<PPPoESecret>): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/ppp/secret/print', {
            '?name': username,
        });

        if (!findResult.success || !findResult.data?.[0]) {
            return { success: false, error: `Secret ${username} not found` };
        }

        const secretId = findResult.data[0]['.id'];
        const params: Record<string, string> = { '.id': secretId };

        if (updates.password) params['password'] = updates.password;
        if (updates.profile) params['profile'] = updates.profile;
        if (updates.disabled !== undefined) params['disabled'] = updates.disabled ? 'yes' : 'no';

        logger.info(`Updating PPPoE secret ${username} on ${router.name}`);
        return mikrotikClient.execute(router, '/ppp/secret/set', params);
    },

    /**
     * Delete a PPPoE secret
     */
    async deleteSecret(router: RouterInfo, username: string): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/ppp/secret/print', {
            '?name': username,
        });

        if (!findResult.success) {
            return { success: false, error: `Failed to search for secret: ${findResult.error}` };
        }

        if (!findResult.data?.[0]) {
            // Secret not found = already deleted, treat as success
            logger.info(`PPPoE secret ${username} not found on ${router.name} (already deleted or never existed)`);
            return { success: true, data: [{ message: 'Secret not found on router (already deleted)' }] };
        }

        const secretId = findResult.data[0]['.id'];
        logger.info(`Deleting PPPoE secret ${username} on ${router.name}`);
        return mikrotikClient.execute(router, '/ppp/secret/remove', { '.id': secretId });
    },

    /**
     * Enable/disable a PPPoE secret
     */
    async setSecretStatus(router: RouterInfo, username: string, disabled: boolean): Promise<CommandResult> {
        return this.updateSecret(router, username, { disabled });
    },

    /**
     * Disconnect an active PPPoE session
     */
    async disconnectSession(router: RouterInfo, username: string): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/ppp/active/print', {
            '?name': username,
        });

        if (!findResult.success || !findResult.data?.length) {
            return { success: true, data: [] }; // Not active
        }

        const results: CommandResult[] = [];
        for (const session of findResult.data) {
            const result = await mikrotikClient.execute(router, '/ppp/active/remove', {
                '.id': session['.id'],
            });
            results.push(result);
        }

        logger.info(`Disconnected ${findResult.data.length} PPPoE session(s) for ${username}`);
        return { success: true, data: results };
    },

    /**
     * Get active PPPoE sessions
     */
    async getActiveSessions(router: RouterInfo): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/ppp/active/print');
    },

    /**
     * Get all PPPoE secrets
     */
    async getAllSecrets(router: RouterInfo): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/ppp/secret/print');
    },

    /**
     * Create a PPPoE profile
     */
    async createProfile(router: RouterInfo, profile: PPPoEProfile): Promise<CommandResult> {
        const params: Record<string, string> = {
            name: profile.name,
        };

        if (profile.localAddress) params['local-address'] = profile.localAddress;
        if (profile.remoteAddress) params['remote-address'] = profile.remoteAddress;
        if (profile.rateLimit) params['rate-limit'] = profile.rateLimit;
        if (profile.onlyOne !== undefined) params['only-one'] = profile.onlyOne ? 'yes' : 'no';

        logger.info(`Creating PPPoE profile ${profile.name} on ${router.name}`);
        return mikrotikClient.execute(router, '/ppp/profile/add', params);
    },

    /**
     * Update a PPPoE profile (for speed changes)
     */
    async updateProfile(router: RouterInfo, profileName: string, updates: Partial<PPPoEProfile>): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/ppp/profile/print', {
            '?name': profileName,
        });

        if (!findResult.success || !findResult.data?.[0]) {
            return { success: false, error: `Profile ${profileName} not found` };
        }

        const profileId = findResult.data[0]['.id'];
        const params: Record<string, string> = { '.id': profileId };

        if (updates.rateLimit) params['rate-limit'] = updates.rateLimit;

        logger.info(`Updating PPPoE profile ${profileName} on ${router.name}`);
        return mikrotikClient.execute(router, '/ppp/profile/set', params);
    },

    /**
     * Get all PPPoE profiles
     */
    async getProfiles(router: RouterInfo): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/ppp/profile/print');
    },
};

export default pppoeCommands;
