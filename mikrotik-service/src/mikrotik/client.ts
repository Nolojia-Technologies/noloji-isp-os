// MikroTik API Client - Core router communication
import { RouterOSAPI } from 'node-routeros';
import logger from '../utils/logger';
import { decrypt } from '../utils/encryption';
import config from '../config';

export interface RouterCredentials {
    host: string;
    port: number;
    username: string;
    password: string;
    useSsl?: boolean;
}

export interface RouterInfo {
    id: number;
    name: string;
    host: string;
    api_port: number;
    api_username: string;
    api_password: string;
    use_ssl: boolean;
    role: 'hotspot' | 'pppoe' | 'edge';
}

export interface CommandResult {
    success: boolean;
    data?: any[];
    error?: string;
    executionTime?: number;
}

/**
 * MikroTik API Client
 * Handles secure communication with MikroTik routers
 */
export class MikrotikApiClient {
    private connections: Map<number, RouterOSAPI> = new Map();

    /**
     * Get or create a connection to a router
     */
    private async getConnection(router: RouterInfo): Promise<RouterOSAPI> {
        // Check for existing connection
        const existing = this.connections.get(router.id);
        if (existing && existing.connected) {
            return existing;
        }

        // Remove stale connection
        if (existing) {
            this.connections.delete(router.id);
        }

        // Create new connection - use plain password from database
        const client = new RouterOSAPI({
            host: router.host,
            port: router.api_port,
            user: router.api_username,
            password: router.api_password,
            timeout: config.mikrotik.connectionTimeout,
        });

        await client.connect();
        this.connections.set(router.id, client);

        logger.info(`Connected to router ${router.name} (${router.host})`);
        return client;
    }

    /**
     * Execute a command on a router
     */
    async execute(router: RouterInfo, command: string, params?: Record<string, string>): Promise<CommandResult> {
        const startTime = Date.now();

        try {
            const client = await this.getConnection(router);

            // Build command with parameters
            const cmdParts = [command];
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    cmdParts.push(`=${key}=${value}`);
                });
            }

            const result = await client.write(cmdParts);

            const executionTime = Date.now() - startTime;
            logger.debug(`Command executed on ${router.name}: ${command}`, { executionTime });

            return {
                success: true,
                data: Array.isArray(result) ? result : [result],
                executionTime,
            };
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            logger.error(`Command failed on ${router.name}: ${command}`, { error: error.message });

            return {
                success: false,
                error: error.message,
                executionTime,
            };
        }
    }

    /**
     * Test connection to a router
     */
    async testConnection(router: RouterInfo): Promise<{ connected: boolean; identity?: string; error?: string }> {
        try {
            const result = await this.execute(router, '/system/identity/print');

            if (result.success && result.data?.[0]) {
                return {
                    connected: true,
                    identity: result.data[0].name,
                };
            }

            return { connected: false, error: 'No response' };
        } catch (error: any) {
            return { connected: false, error: error.message };
        }
    }

    /**
     * Get system resources (CPU, memory, uptime)
     */
    async getSystemResources(router: RouterInfo): Promise<{
        uptime: string;
        cpuLoad: number;
        freeMemory: number;
        totalMemory: number;
        version: string;
        boardName: string;
    } | null> {
        const result = await this.execute(router, '/system/resource/print');

        if (result.success && result.data?.[0]) {
            const resource = result.data[0];
            return {
                uptime: resource.uptime,
                cpuLoad: parseInt(resource['cpu-load'] || '0', 10),
                freeMemory: parseInt(resource['free-memory'] || '0', 10),
                totalMemory: parseInt(resource['total-memory'] || '0', 10),
                version: resource.version,
                boardName: resource['board-name'],
            };
        }

        return null;
    }

    /**
     * Close connection to a router
     */
    async disconnect(routerId: number): Promise<void> {
        const client = this.connections.get(routerId);
        if (client) {
            try {
                await client.close();
            } catch {
                // Ignore close errors
            }
            this.connections.delete(routerId);
        }
    }

    /**
     * Close all connections
     */
    async disconnectAll(): Promise<void> {
        for (const [routerId] of this.connections) {
            await this.disconnect(routerId);
        }
    }
}

// Singleton instance
export const mikrotikClient = new MikrotikApiClient();
export default mikrotikClient;
