// Callback Routes - Webhook endpoints for router push model
// Routers call these endpoints to push data TO the cloud

import { Router, Request, Response } from 'express';
import { getSupabase } from '../services/database';
import logger from '../utils/logger';

const router = Router();

// Authenticate callback requests using token
async function authenticateCallback(routerId: number, token: string): Promise<boolean> {
    const supabase = getSupabase();
    const { data: routerData } = await supabase
        .from('routers')
        .select('callback_token')
        .eq('id', routerId)
        .single();

    if (!routerData || routerData.callback_token !== token) {
        return false;
    }
    return true;
}

/**
 * POST /api/callback/heartbeat
 * Receives router health/status updates
 */
router.post('/heartbeat', async (req: Request, res: Response) => {
    try {
        const {
            routerId,
            token,
            identity,
            cpuLoad,
            freeMemory,
            totalMemory,
            uptime,
            version,
            boardName,
            pppoeActive,
            hotspotActive
        } = req.body;

        // Validate required fields
        if (!routerId || !token) {
            return res.status(400).json({ error: 'Missing routerId or token' });
        }

        // Authenticate
        if (!await authenticateCallback(routerId, token)) {
            logger.warn(`Invalid callback token for router ${routerId}`);
            return res.status(401).json({ error: 'Invalid token' });
        }

        const supabase = getSupabase();

        // Calculate memory percentage
        const memoryPercent = totalMemory > 0
            ? Math.round(((totalMemory - freeMemory) / totalMemory) * 100)
            : 0;

        // Determine status
        let status: 'online' | 'degraded' | 'offline' = 'online';
        if (cpuLoad > 90 || memoryPercent > 90) {
            status = 'degraded';
        }

        // Update router health
        const { error } = await supabase
            .from('routers')
            .update({
                status,
                cpu_usage: cpuLoad,
                memory_usage: memoryPercent,
                uptime,
                last_heartbeat: new Date().toISOString(),
                last_health_check: new Date().toISOString()
            })
            .eq('id', routerId);

        if (error) {
            logger.error('Failed to update router heartbeat', { error: error.message });
            return res.status(500).json({ error: 'Database error' });
        }

        logger.debug(`Heartbeat from router ${routerId}: CPU ${cpuLoad}%, Mem ${memoryPercent}%`);

        res.json({
            success: true,
            message: 'Heartbeat received',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error('Heartbeat callback error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/callback/active-users
 * Receives list of currently active users from router
 */
router.post('/active-users', async (req: Request, res: Response) => {
    try {
        const { routerId, token, users } = req.body;

        // Validate required fields
        if (!routerId || !token) {
            return res.status(400).json({ error: 'Missing routerId or token' });
        }

        // Authenticate
        if (!await authenticateCallback(routerId, token)) {
            logger.warn(`Invalid callback token for router ${routerId}`);
            return res.status(401).json({ error: 'Invalid token' });
        }

        const supabase = getSupabase();

        // Get all usernames from the active users list
        const activeUsernames = (users || []).map((u: any) => u.username).filter(Boolean);

        // First, set all customers for this router to offline
        await supabase
            .from('customers')
            .update({ is_online: false })
            .eq('router_id', routerId);

        // Then set active users to online
        if (activeUsernames.length > 0) {
            const { error } = await supabase
                .from('customers')
                .update({ is_online: true })
                .in('username', activeUsernames);

            if (error) {
                logger.error('Failed to update customer online status', { error: error.message });
            }
        }

        // Update last heartbeat as well
        await supabase
            .from('routers')
            .update({
                last_heartbeat: new Date().toISOString(),
                status: 'online'
            })
            .eq('id', routerId);

        logger.info(`Active users sync from router ${routerId}: ${activeUsernames.length} users online`);

        res.json({
            success: true,
            message: `Synced ${activeUsernames.length} active users`,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error('Active users callback error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/callback/user-event
 * Receives login/logout events from router
 */
router.post('/user-event', async (req: Request, res: Response) => {
    try {
        const { routerId, token, event, username, ip, mac, sessionId } = req.body;

        // Validate required fields
        if (!routerId || !token || !event || !username) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Authenticate
        if (!await authenticateCallback(routerId, token)) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const supabase = getSupabase();

        if (event === 'login') {
            // Update customer to online
            await supabase
                .from('customers')
                .update({
                    is_online: true,
                    last_login: new Date().toISOString()
                })
                .eq('username', username);

            logger.info(`User login: ${username} from router ${routerId}`);
        } else if (event === 'logout') {
            // Update customer to offline
            await supabase
                .from('customers')
                .update({ is_online: false })
                .eq('username', username);

            logger.info(`User logout: ${username} from router ${routerId}`);
        }

        res.json({ success: true, event, username });
    } catch (error: any) {
        logger.error('User event callback error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/callback/accounting
 * Receives data usage updates from router
 */
router.post('/accounting', async (req: Request, res: Response) => {
    try {
        const { routerId, token, username, bytesIn, bytesOut, sessionTime } = req.body;

        // Validate
        if (!routerId || !token || !username) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Authenticate
        if (!await authenticateCallback(routerId, token)) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const supabase = getSupabase();

        // Update customer data usage
        const { data: customer } = await supabase
            .from('customers')
            .select('total_bytes_in, total_bytes_out')
            .eq('username', username)
            .single();

        if (customer) {
            await supabase
                .from('customers')
                .update({
                    total_bytes_in: (customer.total_bytes_in || 0) + (bytesIn || 0),
                    total_bytes_out: (customer.total_bytes_out || 0) + (bytesOut || 0),
                    last_activity: new Date().toISOString()
                })
                .eq('username', username);
        }

        logger.debug(`Accounting update for ${username}: ${bytesIn}/${bytesOut} bytes`);

        res.json({ success: true, username });
    } catch (error: any) {
        logger.error('Accounting callback error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/callback/pending-actions/:routerId
 * Router polls for pending actions (disconnect, speed change, etc.)
 * This enables "push to router" actions without direct API access
 */
router.get('/pending-actions/:routerId', async (req: Request, res: Response) => {
    try {
        const routerId = parseInt(req.params.routerId);
        const token = req.headers['x-callback-token'] as string;

        if (!token) {
            return res.status(400).json({ error: 'Missing token header' });
        }

        // Authenticate
        if (!await authenticateCallback(routerId, token)) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const supabase = getSupabase();

        // Get pending actions for this router
        const { data: actions } = await supabase
            .from('router_pending_actions')
            .select('*')
            .eq('router_id', routerId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10);

        res.json({
            success: true,
            actions: actions || [],
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error('Pending actions error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/callback/action-complete/:actionId
 * Router confirms an action was completed
 */
router.post('/action-complete/:actionId', async (req: Request, res: Response) => {
    try {
        const actionId = req.params.actionId;
        const { routerId, token, success, error: actionError } = req.body;

        if (!routerId || !token) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Authenticate
        if (!await authenticateCallback(routerId, token)) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const supabase = getSupabase();

        // Update action status
        await supabase
            .from('router_pending_actions')
            .update({
                status: success ? 'completed' : 'failed',
                completed_at: new Date().toISOString(),
                error_message: actionError
            })
            .eq('id', actionId)
            .eq('router_id', routerId);

        logger.info(`Action ${actionId} ${success ? 'completed' : 'failed'}`);

        res.json({ success: true });
    } catch (error: any) {
        logger.error('Action complete error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

export default router;
