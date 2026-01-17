const RouterOSAPI = require('node-routeros').RouterOSAPI;
const logger = require('../utils/logger');

class MikroTikAPI {
    constructor(config = {}) {
        this.host = config.host || process.env.MIKROTIK_HOST || '192.168.88.1';
        this.port = config.port || parseInt(process.env.MIKROTIK_PORT || '8728');
        this.username = config.username || process.env.MIKROTIK_USERNAME || 'admin';
        this.password = config.password || process.env.MIKROTIK_PASSWORD || '';
        this.timeout = config.timeout || parseInt(process.env.MIKROTIK_TIMEOUT || '5000');
        this.client = null;
        this.connected = false;
    }

    // Connect to MikroTik router
    async connect() {
        if (this.connected && this.client) {
            return true;
        }

        try {
            logger.info('Attempting to connect to MikroTik router...', {
                host: this.host,
                port: this.port,
                username: this.username
            });

            this.client = new RouterOSAPI({
                host: this.host,
                port: this.port,
                user: this.username,
                password: this.password,
                timeout: this.timeout,
            });

            await this.client.connect();
            this.connected = true;

            logger.info('Successfully connected to MikroTik router');
            return true;

        } catch (error) {
            logger.warn('Could not connect to MikroTik router (this is OK if router not configured yet):', error.message);
            this.connected = false;
            return false;
        }
    }

    // Disconnect from router
    async disconnect() {
        if (this.client && this.connected) {
            try {
                this.client.close();
                this.connected = false;
                logger.info('Disconnected from MikroTik router');
            } catch (error) {
                logger.error('Error disconnecting from MikroTik:', error.message);
            }
        }
    }

    // Ensure connection before executing commands
    async ensureConnection() {
        if (!this.connected || !this.client) {
            const connected = await this.connect();
            if (!connected) {
                throw new Error('Not connected to MikroTik router');
            }
        }
    }

    // Execute RouterOS command
    async executeCommand(command) {
        await this.ensureConnection();
        try {
            const result = await this.client.write(command);
            return result;
        } catch (error) {
            logger.error(`Error executing command ${command}:`, error.message);
            throw error;
        }
    }

    // Get all active hotspot users
    async getActiveHotspotUsers() {
        try {
            const users = await this.executeCommand('/ip/hotspot/active/print');
            return users.map(user => ({
                id: user['.id'],
                user: user.user || '',
                address: user.address || '',
                macAddress: user['mac-address'] || '',
                loginBy: user['login-by'] || '',
                uptime: user.uptime || '',
                bytesIn: parseInt(user['bytes-in'] || 0),
                bytesOut: parseInt(user['bytes-out'] || 0),
            }));
        } catch (error) {
            logger.error('Error fetching active hotspot users:', error.message);
            return [];
        }
    }

    // Disconnect a hotspot user by username
    async disconnectHotspotUser(username) {
        try {
            const activeUsers = await this.executeCommand([
                '/ip/hotspot/active/print',
                `?user=${username}`
            ]);

            if (activeUsers.length === 0) {
                return { success: false, message: 'User not found in active sessions' };
            }

            for (const user of activeUsers) {
                await this.executeCommand(['/ip/hotspot/active/remove', `=.id=${user['.id']}`]);
            }

            return {
                success: true,
                message: `Disconnected ${activeUsers.length} session(s)`,
                count: activeUsers.length
            };
        } catch (error) {
            logger.error('Error disconnecting hotspot user:', error.message);
            throw error;
        }
    }

    // Disconnect by MAC address
    async disconnectByMac(macAddress) {
        try {
            const activeUsers = await this.executeCommand([
                '/ip/hotspot/active/print',
                `?mac-address=${macAddress}`
            ]);

            if (activeUsers.length === 0) {
                return { success: false, message: 'MAC address not found in active sessions' };
            }

            for (const user of activeUsers) {
                await this.executeCommand(['/ip/hotspot/active/remove', `=.id=${user['.id']}`]);
            }

            return {
                success: true,
                message: `Disconnected ${activeUsers.length} session(s)`,
                count: activeUsers.length
            };
        } catch (error) {
            logger.error('Error disconnecting by MAC:', error.message);
            throw error;
        }
    }

    // Create hotspot user
    async createHotspotUser(username, password, profile = 'default', comment = '') {
        try {
            await this.executeCommand([
                '/ip/hotspot/user/add',
                `=name=${username}`,
                `=password=${password}`,
                `=profile=${profile}`,
                `=comment=${comment || 'Created via API'}`
            ]);

            return { success: true, username };
        } catch (error) {
            logger.error('Error creating hotspot user:', error.message);
            throw error;
        }
    }

    // Remove hotspot user
    async removeHotspotUser(username) {
        try {
            const users = await this.executeCommand([
                '/ip/hotspot/user/print',
                `?name=${username}`
            ]);

            if (users.length === 0) {
                return { success: false, message: 'User not found' };
            }

            for (const user of users) {
                await this.executeCommand(['/ip/hotspot/user/remove', `=.id=${user['.id']}`]);
            }

            return { success: true, message: 'User removed successfully' };
        } catch (error) {
            logger.error('Error removing hotspot user:', error.message);
            throw error;
        }
    }

    // Get all hotspot users
    async getAllHotspotUsers() {
        try {
            const users = await this.executeCommand('/ip/hotspot/user/print');
            return users.map(user => ({
                id: user['.id'],
                name: user.name || '',
                profile: user.profile || '',
                uptime: user.uptime || '',
                bytesIn: parseInt(user['bytes-in'] || 0),
                bytesOut: parseInt(user['bytes-out'] || 0),
                comment: user.comment || '',
            }));
        } catch (error) {
            logger.error('Error fetching hotspot users:', error.message);
            return [];
        }
    }

    // Add simple queue for bandwidth limit
    async addSimpleQueue(name, target, uploadLimit, downloadLimit, comment = '') {
        try {
            const maxLimit = `${uploadLimit * 1024}/${downloadLimit * 1024}`;

            await this.executeCommand([
                '/queue/simple/add',
                `=name=${name}`,
                `=target=${target}`,
                `=max-limit=${maxLimit}`,
                `=comment=${comment || 'Created via API'}`
            ]);

            return { success: true };
        } catch (error) {
            logger.error('Error adding simple queue:', error.message);
            throw error;
        }
    }

    // Update simple queue
    async updateSimpleQueue(name, uploadLimit, downloadLimit) {
        try {
            const queues = await this.executeCommand([
                '/queue/simple/print',
                `?name=${name}`
            ]);

            if (queues.length === 0) {
                return { success: false, message: 'Queue not found' };
            }

            const maxLimit = `${uploadLimit * 1024}/${downloadLimit * 1024}`;

            await this.executeCommand([
                '/queue/simple/set',
                `=.id=${queues[0]['.id']}`,
                `=max-limit=${maxLimit}`
            ]);

            return { success: true, message: 'Queue updated successfully' };
        } catch (error) {
            logger.error('Error updating simple queue:', error.message);
            throw error;
        }
    }

    // Remove simple queue
    async removeSimpleQueue(name) {
        try {
            const queues = await this.executeCommand([
                '/queue/simple/print',
                `?name=${name}`
            ]);

            if (queues.length === 0) {
                return { success: false, message: 'Queue not found' };
            }

            for (const queue of queues) {
                await this.executeCommand(['/queue/simple/remove', `=.id=${queue['.id']}`]);
            }

            return { success: true, message: 'Queue removed successfully' };
        } catch (error) {
            logger.error('Error removing simple queue:', error.message);
            throw error;
        }
    }

    // Get all simple queues
    async getAllSimpleQueues() {
        try {
            const queues = await this.executeCommand('/queue/simple/print');
            return queues.map(queue => ({
                id: queue['.id'],
                name: queue.name || '',
                target: queue.target || '',
                maxLimit: queue['max-limit'] || '',
                bytesIn: parseInt(queue['bytes-in'] || 0),
                bytesOut: parseInt(queue['bytes-out'] || 0),
            }));
        } catch (error) {
            logger.error('Error fetching simple queues:', error.message);
            return [];
        }
    }

    // Get router system resources
    async getSystemResources() {
        try {
            const resources = await this.executeCommand('/system/resource/print');

            if (resources.length === 0) {
                throw new Error('No resource data available');
            }

            const resource = resources[0];

            return {
                uptime: resource.uptime || '',
                version: resource.version || '',
                buildTime: resource['build-time'] || '',
                freeMemory: parseInt(resource['free-memory'] || 0),
                totalMemory: parseInt(resource['total-memory'] || 0),
                cpuLoad: parseInt(resource['cpu-load'] || 0),
                freeHddSpace: parseInt(resource['free-hdd-space'] || 0),
                totalHddSpace: parseInt(resource['total-hdd-space'] || 0),
                architectureName: resource['architecture-name'] || '',
                boardName: resource['board-name'] || '',
                platform: resource.platform || '',
            };
        } catch (error) {
            logger.error('Error fetching system resources:', error.message);
            throw error;
        }
    }

    // Get router identity
    async getIdentity() {
        try {
            const identity = await this.executeCommand('/system/identity/print');
            return identity[0]?.name || 'Unknown';
        } catch (error) {
            logger.error('Error fetching router identity:', error.message);
            return 'Unknown';
        }
    }

    // Get interface statistics
    async getInterfaceStats() {
        try {
            const interfaces = await this.executeCommand('/interface/print');

            return interfaces.map(iface => ({
                id: iface['.id'],
                name: iface.name || '',
                type: iface.type || '',
                running: iface.running === 'true',
                disabled: iface.disabled === 'true',
                rxByte: parseInt(iface['rx-byte'] || 0),
                txByte: parseInt(iface['tx-byte'] || 0),
                rxPacket: parseInt(iface['rx-packet'] || 0),
                txPacket: parseInt(iface['tx-packet'] || 0),
            }));
        } catch (error) {
            logger.error('Error fetching interface stats:', error.message);
            return [];
        }
    }

    // Check RADIUS configuration
    async checkRadiusConfig() {
        try {
            const radiusServers = await this.executeCommand('/radius/print');

            return radiusServers.map(server => ({
                id: server['.id'],
                service: server.service || '',
                address: server.address || '',
                secret: '***',
                timeout: server.timeout || '',
                disabled: server.disabled === 'true',
            }));
        } catch (error) {
            logger.error('Error checking RADIUS config:', error.message);
            return [];
        }
    }

    // Test connection to router
    async testConnection() {
        try {
            await this.connect();
            const identity = await this.getIdentity();
            const resources = await this.getSystemResources();

            return {
                success: true,
                connected: true,
                identity,
                uptime: resources.uptime,
                version: resources.version,
            };
        } catch (error) {
            return {
                success: false,
                connected: false,
                error: error.message,
            };
        }
    }
}

module.exports = MikroTikAPI;
