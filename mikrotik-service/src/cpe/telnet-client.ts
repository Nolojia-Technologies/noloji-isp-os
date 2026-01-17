// CPE Telnet Client for EPON/GPON ONT Management
import { Telnet } from 'telnet-client';
import logger from '../utils/logger';

export interface CPEConnection {
    ip: string;
    port: number;
    username: string;
    password: string;
    type: 'gpon' | 'epon' | 'mikrotik';
}

export interface CPEResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface OpticalPower {
    rxPower: number | null;  // dBm
    txPower: number | null;  // dBm
}

export interface TrafficStats {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
}

export interface WiFiSettings {
    ssid: string;
    password: string;
    enabled: boolean;
}

/**
 * CPE Telnet Client for EPON/GPON ONT management
 */
export class CPETelnetClient {
    private connection: Telnet;
    private config: CPEConnection;
    private connected: boolean = false;

    constructor(config: CPEConnection) {
        this.config = config;
        this.connection = new Telnet();
    }

    /**
     * Connect to the CPE device
     */
    async connect(): Promise<CPEResult> {
        try {
            const params = {
                host: this.config.ip,
                port: this.config.port,
                timeout: 10000,
                shellPrompt: /[$#>]\s*$/,
                loginPrompt: /login[: ]*$/i,
                passwordPrompt: /password[: ]*$/i,
                username: this.config.username,
                password: this.config.password,
                debug: false,
                negotiationMandatory: false
            };

            await this.connection.connect(params);
            this.connected = true;
            logger.info(`Connected to CPE at ${this.config.ip}`);
            return { success: true };
        } catch (error: any) {
            logger.error(`Failed to connect to CPE at ${this.config.ip}`, { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute a command on the CPE
     */
    async execute(command: string): Promise<CPEResult> {
        if (!this.connected) {
            return { success: false, error: 'Not connected' };
        }

        try {
            const result = await this.connection.exec(command);
            return { success: true, data: result };
        } catch (error: any) {
            logger.error(`Command failed on CPE: ${command}`, { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Disconnect from the CPE
     */
    async disconnect(): Promise<void> {
        try {
            await this.connection.end();
            this.connected = false;
            logger.info(`Disconnected from CPE at ${this.config.ip}`);
        } catch (error) {
            // Ignore disconnect errors
        }
    }

    /**
     * Test connection to CPE
     */
    async testConnection(): Promise<CPEResult> {
        const connectResult = await this.connect();
        if (!connectResult.success) {
            return connectResult;
        }
        await this.disconnect();
        return { success: true, data: { message: 'Connection successful' } };
    }
}

/**
 * GPON ONT specific commands
 */
export const gponCommands = {
    /**
     * Get optical power levels (common GPON ONT format)
     */
    async getOpticalPower(client: CPETelnetClient): Promise<CPEResult> {
        // Common commands for different ONT manufacturers
        const commands = [
            'display ont optical-info',      // Huawei
            'show interface gpon-onu',       // ZTE
            'pon show optic',                // Various
            'show optical',                  // Generic
        ];

        for (const cmd of commands) {
            const result = await client.execute(cmd);
            if (result.success && result.data) {
                const parsed = parseOpticalPower(result.data);
                if (parsed.rxPower !== null || parsed.txPower !== null) {
                    return { success: true, data: parsed };
                }
            }
        }

        return { success: false, error: 'Could not read optical power' };
    },

    /**
     * Get WiFi settings
     */
    async getWiFiSettings(client: CPETelnetClient): Promise<CPEResult> {
        const commands = [
            'show wlan',
            'display wlan ssid',
            'show interface wifi',
        ];

        for (const cmd of commands) {
            const result = await client.execute(cmd);
            if (result.success && result.data) {
                const parsed = parseWiFiSettings(result.data);
                if (parsed.ssid) {
                    return { success: true, data: parsed };
                }
            }
        }

        return { success: false, error: 'Could not read WiFi settings' };
    },

    /**
     * Get traffic statistics
     */
    async getTrafficStats(client: CPETelnetClient): Promise<CPEResult> {
        const commands = [
            'show interface statistics',
            'display traffic',
            'show counters',
        ];

        for (const cmd of commands) {
            const result = await client.execute(cmd);
            if (result.success && result.data) {
                const parsed = parseTrafficStats(result.data);
                if (parsed.bytesIn > 0 || parsed.bytesOut > 0) {
                    return { success: true, data: parsed };
                }
            }
        }

        return { success: false, error: 'Could not read traffic stats' };
    }
};

/**
 * Parse optical power from command output
 */
function parseOpticalPower(output: string): OpticalPower {
    const result: OpticalPower = { rxPower: null, txPower: null };

    // Try to find RX power (various formats)
    const rxPatterns = [
        /rx[:\s]*power[:\s]*([-\d.]+)\s*dbm/i,
        /receive[:\s]*power[:\s]*([-\d.]+)/i,
        /olt rx[:\s]*([-\d.]+)/i,
    ];

    for (const pattern of rxPatterns) {
        const match = output.match(pattern);
        if (match) {
            result.rxPower = parseFloat(match[1]);
            break;
        }
    }

    // Try to find TX power
    const txPatterns = [
        /tx[:\s]*power[:\s]*([-\d.]+)\s*dbm/i,
        /transmit[:\s]*power[:\s]*([-\d.]+)/i,
        /onu tx[:\s]*([-\d.]+)/i,
    ];

    for (const pattern of txPatterns) {
        const match = output.match(pattern);
        if (match) {
            result.txPower = parseFloat(match[1]);
            break;
        }
    }

    return result;
}

/**
 * Parse WiFi settings from command output
 */
function parseWiFiSettings(output: string): WiFiSettings {
    const result: WiFiSettings = { ssid: '', password: '', enabled: false };

    const ssidMatch = output.match(/ssid[:\s]*["']?([^"'\n]+)/i);
    if (ssidMatch) {
        result.ssid = ssidMatch[1].trim();
    }

    const passMatch = output.match(/(?:password|psk|key)[:\s]*["']?([^"'\n]+)/i);
    if (passMatch) {
        result.password = passMatch[1].trim();
    }

    result.enabled = !output.toLowerCase().includes('disabled');

    return result;
}

/**
 * Parse traffic statistics from command output
 */
function parseTrafficStats(output: string): TrafficStats {
    const result: TrafficStats = { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 };

    const bytesInMatch = output.match(/(?:rx|receive|in)[^\d]*([\d,]+)\s*bytes/i);
    if (bytesInMatch) {
        result.bytesIn = parseInt(bytesInMatch[1].replace(/,/g, ''));
    }

    const bytesOutMatch = output.match(/(?:tx|transmit|out)[^\d]*([\d,]+)\s*bytes/i);
    if (bytesOutMatch) {
        result.bytesOut = parseInt(bytesOutMatch[1].replace(/,/g, ''));
    }

    return result;
}

export default CPETelnetClient;
