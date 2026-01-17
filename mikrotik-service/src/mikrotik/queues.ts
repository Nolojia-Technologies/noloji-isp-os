// Queue Commands - Bandwidth management on MikroTik
import mikrotikClient, { RouterInfo, CommandResult } from './client';
import logger from '../utils/logger';

export interface SimpleQueue {
    name: string;
    target: string;  // IP address or range
    maxLimit: string;  // e.g., "2M/5M" (upload/download)
    burstLimit?: string;
    burstThreshold?: string;
    burstTime?: string;
    priority?: number;
    disabled?: boolean;
    comment?: string;
}

/**
 * Queue command functions for bandwidth management
 */
export const queueCommands = {
    /**
     * Create a simple queue for bandwidth limiting
     */
    async createSimpleQueue(router: RouterInfo, queue: SimpleQueue): Promise<CommandResult> {
        const params: Record<string, string> = {
            name: queue.name,
            target: queue.target,
            'max-limit': queue.maxLimit,
        };

        if (queue.burstLimit) params['burst-limit'] = queue.burstLimit;
        if (queue.burstThreshold) params['burst-threshold'] = queue.burstThreshold;
        if (queue.burstTime) params['burst-time'] = queue.burstTime;
        if (queue.priority) params['priority'] = `${queue.priority}/${queue.priority}`;
        if (queue.disabled !== undefined) params['disabled'] = queue.disabled ? 'yes' : 'no';
        if (queue.comment) params['comment'] = queue.comment;

        logger.info(`Creating simple queue ${queue.name} on ${router.name}`);
        return mikrotikClient.execute(router, '/queue/simple/add', params);
    },

    /**
     * Update a simple queue (for speed changes)
     */
    async updateSimpleQueue(router: RouterInfo, queueName: string, updates: Partial<SimpleQueue>): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/queue/simple/print', {
            '?name': queueName,
        });

        if (!findResult.success || !findResult.data?.[0]) {
            return { success: false, error: `Queue ${queueName} not found` };
        }

        const queueId = findResult.data[0]['.id'];
        const params: Record<string, string> = { '.id': queueId };

        if (updates.target) params['target'] = updates.target;
        if (updates.maxLimit) params['max-limit'] = updates.maxLimit;
        if (updates.burstLimit) params['burst-limit'] = updates.burstLimit;
        if (updates.disabled !== undefined) params['disabled'] = updates.disabled ? 'yes' : 'no';

        logger.info(`Updating simple queue ${queueName} on ${router.name}`);
        return mikrotikClient.execute(router, '/queue/simple/set', params);
    },

    /**
     * Delete a simple queue
     */
    async deleteSimpleQueue(router: RouterInfo, queueName: string): Promise<CommandResult> {
        const findResult = await mikrotikClient.execute(router, '/queue/simple/print', {
            '?name': queueName,
        });

        if (!findResult.success || !findResult.data?.[0]) {
            return { success: true }; // Already doesn't exist
        }

        const queueId = findResult.data[0]['.id'];
        logger.info(`Deleting simple queue ${queueName} on ${router.name}`);
        return mikrotikClient.execute(router, '/queue/simple/remove', { '.id': queueId });
    },

    /**
     * Enable/disable a queue
     */
    async setQueueStatus(router: RouterInfo, queueName: string, disabled: boolean): Promise<CommandResult> {
        return this.updateSimpleQueue(router, queueName, { disabled });
    },

    /**
     * Get all simple queues
     */
    async getSimpleQueues(router: RouterInfo): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/queue/simple/print');
    },

    /**
     * Find queue by target IP
     */
    async findQueueByTarget(router: RouterInfo, targetIp: string): Promise<CommandResult> {
        return mikrotikClient.execute(router, '/queue/simple/print', {
            '?target': targetIp,
        });
    },

    /**
     * Update speed limit for a client (by queue name or target)
     */
    async updateSpeedLimit(router: RouterInfo, identifier: string, uploadMbps: number, downloadMbps: number): Promise<CommandResult> {
        const maxLimit = `${uploadMbps}M/${downloadMbps}M`;
        return this.updateSimpleQueue(router, identifier, { maxLimit });
    },
};

export default queueCommands;
