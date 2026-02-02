// MikroTik API Client - Core router communication
import { RouterOSAPI } from 'node-routeros';
import logger from '../utils/logger';
import { decrypt } from '../utils/encryption';
import config from '../config';
import net from 'net';

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

export interface ConnectionDiagnostics {
    reachable: boolean;
    portOpen: boolean;
    authenticated: boolean;
    identity?: string;
    error?: string;
    latencyMs?: number;
    details: string[];
}

/**
 * Test if a port is reachable
 */
async function testPort(host: string, port: number, timeoutMs: number = 5000): Promise<{ open: boolean; latencyMs: number; error?: string }> {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const socket = new net.Socket();

        socket.setTimeout(timeoutMs);

        socket.on('connect', () => {
            const latencyMs = Date.now() - startTime;
            socket.destroy();
            resolve({ open: true, latencyMs });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ open: false, latencyMs: timeoutMs, error: 'Connection timed out' });
        });

        socket.on('error', (err: any) => {
            const latencyMs = Date.now() - startTime;
            socket.destroy();
            resolve({ open: false, latencyMs, error: err.message || 'Connection refused' });
        });

        socket.connect(port, host);
    });
}

/**
 * MikroTik API Client
 * Handles secure communication with MikroTik routers
 */
export class MikrotikApiClient {
    private connections: Map<number, RouterOSAPI> = new Map();

    /**
     * Diagnose connection issues to a router
     */
    async diagnoseConnection(router: RouterInfo): Promise<ConnectionDiagnostics> {
        const diagnostics: ConnectionDiagnostics = {
            reachable: false,
            portOpen: false,
            authenticated: false,
            details: []
        };

        // Step 1: Test if host is reachable on API port
        diagnostics.details.push(`Testing connection to ${router.host}:${router.api_port}...`);

        const portTest = await testPort(router.host, router.api_port, 10000);
        diagnostics.latencyMs = portTest.latencyMs;

        if (!portTest.open) {
            diagnostics.reachable = false;
            diagnostics.portOpen = false;
            diagnostics.error = portTest.error || 'Port not reachable';
            diagnostics.details.push(`❌ Port ${router.api_port} is not reachable: ${portTest.error}`);
            diagnostics.details.push(`   Possible causes:`);
            diagnostics.details.push(`   - Router IP is incorrect or router is powered off`);
            diagnostics.details.push(`   - API service is not enabled on the router`);
            diagnostics.details.push(`   - Firewall blocking port ${router.api_port}`);
            diagnostics.details.push(`   - Wrong API port number`);
            return diagnostics;
        }

        diagnostics.reachable = true;
        diagnostics.portOpen = true;
        diagnostics.details.push(`✓ Port ${router.api_port} is open (latency: ${portTest.latencyMs}ms)`);

        // Step 2: Try to authenticate
        diagnostics.details.push(`Attempting authentication with user '${router.api_username}'...`);

        try {
            const client = new RouterOSAPI({
                host: router.host,
                port: router.api_port,
                user: router.api_username,
                password: router.api_password,
                timeout: 30000, // 30 second timeout for auth
            });

            await client.connect();
            diagnostics.authenticated = true;
            diagnostics.details.push(`✓ Authentication successful`);

            // Get router identity
            try {
                const result = await client.write(['/system/identity/print']);
                if (result && result[0]) {
                    diagnostics.identity = result[0].name;
                    diagnostics.details.push(`✓ Router identity: ${result[0].name}`);
                }
            } catch (e) {
                diagnostics.details.push(`⚠ Could not get router identity`);
            }

            await client.close();
        } catch (error: any) {
            diagnostics.authenticated = false;
            diagnostics.error = error.message;
            diagnostics.details.push(`❌ Authentication failed: ${error.message}`);

            if (error.message.includes('cannot log in')) {
                diagnostics.details.push(`   Possible causes:`);
                diagnostics.details.push(`   - Username is incorrect`);
                diagnostics.details.push(`   - Password is incorrect`);
                diagnostics.details.push(`   - User account is disabled on router`);
                diagnostics.details.push(`   - User doesn't have API access permission`);
            } else if (error.message.includes('timeout')) {
                diagnostics.details.push(`   Possible causes:`);
                diagnostics.details.push(`   - Network latency is too high`);
                diagnostics.details.push(`   - Router is overloaded`);
            }
        }

        return diagnostics;
    }

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

        // Log connection attempt with masked password
        logger.debug(`Connecting to router ${router.name} at ${router.host}:${router.api_port} as ${router.api_username}`);

        // Create new connection - use plain password from database
        // Increased timeout for more reliable connections
        const client = new RouterOSAPI({
            host: router.host,
            port: router.api_port,
            user: router.api_username,
            password: router.api_password,
            timeout: 30000, // 30 seconds for better reliability over unstable networks
        });

        try {
            await client.connect();
            this.connections.set(router.id, client);
            logger.info(`Connected to router ${router.name} (${router.host})`);
            return client;
        } catch (error: any) {
            logger.error(`Failed to connect to router ${router.name} (${router.host}:${router.api_port}): ${error.message}`);
            throw new Error(`Connection to router ${router.name} failed: ${error.message}`);
        }
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
                    // Query parameters (starting with ?) use different syntax
                    if (key.startsWith('?')) {
                        // Query: ?name=value (no leading =)
                        cmdParts.push(`${key}=${value}`);
                    } else if (key.startsWith('.')) {
                        // ID reference: =.id=*1
                        cmdParts.push(`=${key}=${value}`);
                    } else {
                        // Regular parameter: =key=value
                        cmdParts.push(`==${value}` === value ? `=${key}` : `=${key}=${value}`);
                    }
                });
            }

            logger.debug(`Executing on ${router.name}: ${cmdParts.join(' ')}`);
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
