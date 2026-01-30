// Main entry point for MikroTik Service
import express from 'express';
import cors from 'cors';
import config from './config';
import logger from './utils/logger';
import { healthMonitor } from './services/health-monitor';
import { billingEnforcement } from './services/billing-enforcement';
import { db } from './services/database';
import { mikrotikClient, hotspotCommands, pppoeCommands, queueCommands } from './mikrotik';
import { encrypt } from './utils/encryption';

const app = express();

// Middleware
// Middleware
app.use(cors({
    origin: true, // Allow any origin (reflects request origin)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mikrotik-service' });
});

// ============================================
// Router Management Endpoints
// ============================================

// Test router connection
app.post('/api/routers/:id/test', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const result = await mikrotikClient.testConnection(billingEnforcement.toRouterInfo(router));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get router system resources
app.get('/api/routers/:id/resources', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const resources = await mikrotikClient.getSystemResources(billingEnforcement.toRouterInfo(router));
        res.json(resources);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get all profiles from a router (hotspot + PPPoE)
app.get('/api/routers/:id/profiles', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const routerInfo = billingEnforcement.toRouterInfo(router);
        const profiles: { name: string; type: 'HOTSPOT' | 'PPPOE'; rateLimit?: string }[] = [];

        // Get hotspot profiles
        try {
            const hotspotResult = await hotspotCommands.getProfiles(routerInfo);
            if (hotspotResult.success && hotspotResult.data) {
                for (const p of hotspotResult.data) {
                    if (p.name && p.name !== 'default') {
                        profiles.push({
                            name: p.name,
                            type: 'HOTSPOT',
                            rateLimit: p['rate-limit'] || undefined
                        });
                    }
                }
            }
        } catch (e) {
            // Hotspot not configured
        }

        // Get PPPoE profiles
        try {
            const pppoeResult = await pppoeCommands.getProfiles(routerInfo);
            if (pppoeResult.success && pppoeResult.data) {
                for (const p of pppoeResult.data) {
                    if (p.name && p.name !== 'default' && p.name !== 'default-encryption') {
                        profiles.push({
                            name: p.name,
                            type: 'PPPOE',
                            rateLimit: p['rate-limit'] || undefined
                        });
                    }
                }
            }
        } catch (e) {
            // PPPoE not configured
        }

        res.json({ success: true, profiles });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Hotspot Endpoints
// ============================================

// Get active hotspot users
app.get('/api/routers/:id/hotspot/active', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const result = await hotspotCommands.getActiveUsers(billingEnforcement.toRouterInfo(router));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Disconnect hotspot user
app.post('/api/routers/:id/hotspot/disconnect/:username', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const result = await hotspotCommands.disconnectUser(
            billingEnforcement.toRouterInfo(router),
            req.params.username
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PPPoE Endpoints
// ============================================

// Get active PPPoE sessions
app.get('/api/routers/:id/pppoe/active', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const result = await pppoeCommands.getActiveSessions(billingEnforcement.toRouterInfo(router));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Disconnect PPPoE session
app.post('/api/routers/:id/pppoe/disconnect/:username', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const result = await pppoeCommands.disconnectSession(
            billingEnforcement.toRouterInfo(router),
            req.params.username
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Queue Endpoints
// ============================================

// Get all queues
app.get('/api/routers/:id/queues', async (req, res) => {
    try {
        const router = await db.getRouterById(parseInt(req.params.id));
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const result = await queueCommands.getSimpleQueues(billingEnforcement.toRouterInfo(router));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Billing Enforcement Endpoints
// ============================================

// Suspend customer
app.post('/api/customers/:id/suspend', async (req, res) => {
    try {
        const result = await billingEnforcement.suspendCustomer(parseInt(req.params.id));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Activate customer
app.post('/api/customers/:id/activate', async (req, res) => {
    try {
        const result = await billingEnforcement.activateCustomer(parseInt(req.params.id));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Provision customer
app.post('/api/customers/:id/provision', async (req, res) => {
    try {
        const result = await billingEnforcement.provisionCustomer(parseInt(req.params.id));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete customer from MikroTik (removes hotspot user or PPPoE secret)
app.delete('/api/customers/:id/remove-from-mikrotik', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        logger.info(`Attempting to delete customer ${customerId} from MikroTik`);

        const details = await db.getCustomerWithDetails(customerId);

        if (!details) {
            logger.warn(`Customer ${customerId} not found in database`);
            return res.status(404).json({ success: false, error: 'Customer not found in database' });
        }

        const { customer, router } = details;
        logger.info(`Found customer ${customer.username}, connection_type: ${customer.connection_type}, router: ${router?.name || 'none'}`);

        if (!router) {
            return res.json({ success: true, message: 'No router assigned, nothing to delete' });
        }

        const routerInfo = billingEnforcement.toRouterInfo(router);
        const connType = customer.connection_type?.toUpperCase();

        let result;
        if (connType === 'HOTSPOT') {
            // Disconnect active session first (non-fatal if fails)
            try {
                await hotspotCommands.disconnectUser(routerInfo, customer.username);
            } catch (disconnectError: any) {
                logger.warn(`Could not disconnect hotspot user ${customer.username}: ${disconnectError.message}`);
            }
            // Delete hotspot user
            result = await hotspotCommands.deleteUser(routerInfo, customer.username);
        } else if (connType === 'PPPOE') {
            // Disconnect active session first (non-fatal if fails)
            try {
                await pppoeCommands.disconnectSession(routerInfo, customer.username);
            } catch (disconnectError: any) {
                logger.warn(`Could not disconnect PPPoE session ${customer.username}: ${disconnectError.message}`);
            }
            // Delete PPPoE secret
            result = await pppoeCommands.deleteSecret(routerInfo, customer.username);
        } else {
            logger.warn(`Unknown connection type: ${connType} for customer ${customer.username}`);
            return res.json({ success: true, message: `Unknown connection type: ${connType}` });
        }

        if (!result.success) {
            logger.error(`Failed to delete ${customer.username} from MikroTik: ${result.error}`);
            return res.status(500).json({ success: false, error: result.error });
        }

        logger.info(`Successfully deleted customer ${customer.username} from MikroTik router ${router.name}`);
        res.json({ success: true, message: `Removed ${customer.username} from MikroTik router ${router.name}`, data: result.data });
    } catch (error: any) {
        logger.error('Failed to delete customer from MikroTik', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, error: error.message });
    }
});

// Change customer speed
app.post('/api/customers/:id/speed', async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) {
            return res.status(400).json({ error: 'planId is required' });
        }

        const result = await billingEnforcement.changeSpeed(parseInt(req.params.id), planId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Process expired subscriptions
app.post('/api/billing/process-expired', async (req, res) => {
    try {
        const results = await billingEnforcement.processExpiredSubscriptions();
        res.json({ processed: results.length, results });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Profile Sync Endpoints
// ============================================

// Sync a package to all routers
app.post('/api/packages/:id/sync', async (req, res) => {
    try {
        const { profileSync } = await import('./services/profile-sync');
        const results = await profileSync.syncPlanToAllRouters(parseInt(req.params.id));

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        res.json({
            success: failCount === 0,
            message: `Synced to ${successCount} routers, ${failCount} failed`,
            results
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Sync all packages to a specific router
app.post('/api/routers/:id/sync-profiles', async (req, res) => {
    try {
        const { profileSync } = await import('./services/profile-sync');
        const results = await profileSync.syncAllPlansToRouter(parseInt(req.params.id));

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        res.json({
            success: failCount === 0,
            message: `Synced ${successCount} profiles, ${failCount} failed`,
            results
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Import Users from MikroTik
// ============================================

// Import all users from MikroTik routers into the database
app.post('/api/customers/import-from-mikrotik', async (req, res) => {
    try {
        const supabase = (await import('./services/database')).getSupabase();

        // Get all active routers
        const routers = await db.getRouters();

        if (routers.length === 0) {
            return res.json({ success: true, message: 'No routers found', imported: 0 });
        }

        const importedUsers: any[] = [];
        const skippedUsers: string[] = [];
        const errors: string[] = [];

        for (const router of routers) {
            const routerInfo = billingEnforcement.toRouterInfo(router);

            // Get hotspot users
            try {
                const hotspotResult = await hotspotCommands.getAllUsers(routerInfo);
                if (hotspotResult.success && hotspotResult.data) {
                    for (const user of hotspotResult.data) {
                        if (!user.name || user.name === 'default-trial') continue;

                        // Check if user already exists
                        const { data: existing } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('username', user.name)
                            .single();

                        if (existing) {
                            skippedUsers.push(user.name);
                            continue;
                        }

                        // Create customer with MikroTik profile
                        const { data: newCustomer, error } = await supabase
                            .from('customers')
                            .insert({
                                username: user.name,
                                password: user.password || 'imported',
                                connection_type: 'HOTSPOT',
                                router_id: router.id,
                                is_active: user.disabled !== 'true',
                                is_online: false,
                                full_name: user.comment || null,
                                mikrotik_profile: user.profile || null
                            })
                            .select()
                            .single();

                        if (error) {
                            errors.push(`Hotspot ${user.name}: ${error.message}`);
                        } else {
                            importedUsers.push({
                                username: user.name,
                                type: 'HOTSPOT',
                                router: router.name,
                                mikrotik_profile: user.profile || null
                            });
                        }
                    }
                }
            } catch (e: any) {
                logger.warn(`Failed to get hotspot users from ${router.name}`, { error: e.message });
            }

            // Get PPPoE secrets
            try {
                const pppoeResult = await pppoeCommands.getAllSecrets(routerInfo);
                if (pppoeResult.success && pppoeResult.data) {
                    for (const secret of pppoeResult.data) {
                        if (!secret.name || secret.name === 'default') continue;

                        // Check if user already exists
                        const { data: existing } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('username', secret.name)
                            .single();

                        if (existing) {
                            skippedUsers.push(secret.name);
                            continue;
                        }

                        // Create customer with MikroTik profile
                        const { data: newCustomer, error } = await supabase
                            .from('customers')
                            .insert({
                                username: secret.name,
                                password: secret.password || 'imported',
                                connection_type: 'PPPOE',
                                router_id: router.id,
                                is_active: secret.disabled !== 'true',
                                is_online: false,
                                full_name: secret.comment || null,
                                mikrotik_profile: secret.profile || null
                            })
                            .select()
                            .single();

                        if (error) {
                            errors.push(`PPPoE ${secret.name}: ${error.message}`);
                        } else {
                            importedUsers.push({
                                username: secret.name,
                                type: 'PPPOE',
                                router: router.name,
                                mikrotik_profile: secret.profile || null
                            });
                        }
                    }
                }
            } catch (e: any) {
                logger.warn(`Failed to get PPPoE secrets from ${router.name}`, { error: e.message });
            }

            // Also get PPPoE active connections (currently connected users)
            try {
                const activeResult = await pppoeCommands.getActiveSessions(routerInfo);
                if (activeResult.success && activeResult.data) {
                    for (const session of activeResult.data) {
                        if (!session.name) continue;

                        // Check if user already exists
                        const { data: existing } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('username', session.name)
                            .single();

                        if (existing) {
                            // Update to online status
                            await supabase
                                .from('customers')
                                .update({ is_online: true })
                                .eq('id', existing.id);
                            continue;
                        }

                        // Create customer from active session
                        const { data: newCustomer, error } = await supabase
                            .from('customers')
                            .insert({
                                username: session.name,
                                password: 'imported-active',
                                connection_type: 'PPPOE',
                                router_id: router.id,
                                is_active: true,
                                is_online: true,
                                full_name: null
                            })
                            .select()
                            .single();

                        if (error) {
                            errors.push(`Active PPPoE ${session.name}: ${error.message}`);
                        } else {
                            importedUsers.push({ username: session.name, type: 'PPPOE-ACTIVE', router: router.name });
                        }
                    }
                }
            } catch (e: any) {
                logger.warn(`Failed to get active PPPoE from ${router.name}`, { error: e.message });
            }
        }

        logger.info(`Imported ${importedUsers.length} users from MikroTik, skipped ${skippedUsers.length} existing`);

        res.json({
            success: true,
            message: `Imported ${importedUsers.length} users, skipped ${skippedUsers.length} existing`,
            imported: importedUsers,
            skipped: skippedUsers,
            errors
        });
    } catch (error: any) {
        logger.error('Failed to import users from MikroTik', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Online Status Sync Endpoints
// ============================================

// Sync online status for all customers from all routers
app.post('/api/customers/sync-online-status', async (req, res) => {
    try {
        const supabase = (await import('./services/database')).getSupabase();

        // Get all active routers
        const routers = await db.getRouters();
        const onlineRouters = routers.filter(r => r.is_active);

        if (onlineRouters.length === 0) {
            return res.json({ success: true, message: 'No active routers', updated: 0 });
        }

        // Collect all active users from all routers
        const activeUsernames = new Set<string>();
        const routerErrors: { router: string; error: string }[] = [];

        // Collect active users from all routers in parallel
        await Promise.all(onlineRouters.map(async (router) => {
            const routerInfo = billingEnforcement.toRouterInfo(router);

            try {
                // Try to get hotspot active users
                let hotspotSuccess = false;
                try {
                    const hotspotResult = await hotspotCommands.getActiveUsers(routerInfo);
                    if (hotspotResult.success && hotspotResult.data) {
                        hotspotResult.data.forEach((user: any) => {
                            if (user.user) activeUsernames.add(user.user);
                        });
                        hotspotSuccess = true;
                    }
                } catch (e) {
                    // Hotspot not configured or other error
                }

                // Try to get PPPoE active sessions
                let pppoeSuccess = false;
                try {
                    const pppoeResult = await pppoeCommands.getActiveSessions(routerInfo);
                    if (pppoeResult.success && pppoeResult.data) {
                        pppoeResult.data.forEach((session: any) => {
                            if (session.name) activeUsernames.add(session.name);
                        });
                        pppoeSuccess = true;
                    }
                } catch (e) {
                    // PPPoE not configured or other error
                }

                // If both failed to return data (and at least one should have worked if configured), consider it a partial connection failure?
                // Actually, hotspotCommands/pppoeCommands throw if connection fails.
                // If we got here, connection likely worked but maybe no services active. 
                // However, to be safe, let's catch the outer try/catch which wraps the core logic.

            } catch (error: any) {
                logger.warn(`Failed to get active users from router ${router.name}`, { error: error.message });
                routerErrors.push({ router: router.name, error: error.message });
            }
        }));

        logger.info(`Found ${activeUsernames.size} active users across all routers`);

        // Update all customers to offline first
        await supabase
            .from('customers')
            .update({ is_online: false })
            .neq('id', 0); // Update all

        // Update active users to online
        let updatedCount = 0;
        if (activeUsernames.size > 0) {
            const { data: updatedCustomers, error } = await supabase
                .from('customers')
                .update({ is_online: true })
                .in('username', Array.from(activeUsernames))
                .select('username');

            if (error) {
                logger.error('Failed to update online status', { error: error.message });
            }

            updatedCount = updatedCustomers?.length || 0;
            logger.info(`Updated ${updatedCount} customers to online status`);
        }

        res.json({
            success: true,
            message: `Synced online status. ${activeUsernames.size} active users found, ${updatedCount} customers updated. ${routerErrors.length > 0 ? `${routerErrors.length} routers failed.` : ''}`,
            activeUsers: Array.from(activeUsernames),
            updated: updatedCount,
            errors: routerErrors
        });
    } catch (error: any) {
        logger.error('Failed to sync online status', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Sync active users endpoint (called by MikroTik script)
app.post('/api/callback/sync-active-users', async (req, res) => {
    try {
        const { router_identity, users } = req.body;
        const supabase = (await import('./services/database')).getSupabase();

        let routerId: number | null = null;

        // Try to find router and update health
        if (router_identity) {
            const { data: routers } = await supabase.from('routers').select('id, name').eq('name', router_identity);
            if (routers && routers.length > 0) {
                routerId = routers[0].id;
                await supabase.from('routers').update({
                    status: 'online',
                    last_health_check: new Date().toISOString()
                }).eq('id', routerId);
            }
        }

        if (!users || !Array.isArray(users)) {
            return res.json({ success: true, message: 'No users provided' });
        }

        logger.info(`Received sync from router '${router_identity}': ${users.length} active users`);

        if (users.length > 0) {
            // Mark these users as online
            await supabase.from('customers').update({ is_online: true }).in('username', users);

            // Mark others as offline if we matched a router
            if (routerId) {
                // Construct the list for the 'not' filter properly
                const userList = `(${users.map(u => `"${u}"`).join(',')})`;
                await supabase.from('customers')
                    .update({ is_online: false })
                    .eq('router_id', routerId)
                    .not('username', 'in', userList);
            }
        } else if (routerId) {
            // Zero users active on this router
            await supabase.from('customers').update({ is_online: false }).eq('router_id', routerId);
        }

        res.json({ success: true, updated: users.length });
    } catch (error: any) {
        logger.error('Sync Callback Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Utility Endpoints
// ============================================

// Encrypt password (for adding routers)
app.post('/api/utils/encrypt', (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'password is required' });
        }

        const encrypted = encrypt(password);
        res.json({ encrypted });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CPE (Customer Premises Equipment) Endpoints
// ============================================

import { CPETelnetClient, gponCommands } from './cpe';

// Get customer CPE info
app.get('/api/customers/:id/cpe', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        const supabase = (await import('./services/database')).getSupabase();

        const { data, error } = await supabase
            .from('customer_cpe')
            .select('*')
            .eq('customer_id', customerId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        res.json({ success: true, data: data || null });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Save/Update customer CPE credentials
app.post('/api/customers/:id/cpe', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        const { cpe_ip, cpe_port, cpe_username, cpe_password, cpe_type } = req.body;
        const supabase = (await import('./services/database')).getSupabase();

        const { data, error } = await supabase
            .from('customer_cpe')
            .upsert({
                customer_id: customerId,
                cpe_ip,
                cpe_port: cpe_port || 23,
                cpe_username: cpe_username || 'admin',
                cpe_password,
                cpe_type: cpe_type || 'gpon',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'customer_id'
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`Saved CPE credentials for customer ${customerId}`);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Test CPE connection
app.post('/api/customers/:id/cpe/test', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        const supabase = (await import('./services/database')).getSupabase();

        const { data: cpe } = await supabase
            .from('customer_cpe')
            .select('*')
            .eq('customer_id', customerId)
            .single();

        if (!cpe) {
            return res.status(404).json({ error: 'No CPE configured for this customer' });
        }

        const client = new CPETelnetClient({
            ip: cpe.cpe_ip,
            port: cpe.cpe_port,
            username: cpe.cpe_username,
            password: cpe.cpe_password,
            type: cpe.cpe_type
        });

        const result = await client.testConnection();

        if (result.success) {
            await supabase
                .from('customer_cpe')
                .update({ last_connected: new Date().toISOString() })
                .eq('customer_id', customerId);
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get optical power levels
app.get('/api/customers/:id/cpe/optical', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        const supabase = (await import('./services/database')).getSupabase();

        const { data: cpe } = await supabase
            .from('customer_cpe')
            .select('*')
            .eq('customer_id', customerId)
            .single();

        if (!cpe) {
            return res.status(404).json({ error: 'No CPE configured' });
        }

        const client = new CPETelnetClient({
            ip: cpe.cpe_ip,
            port: cpe.cpe_port,
            username: cpe.cpe_username,
            password: cpe.cpe_password,
            type: cpe.cpe_type
        });

        const connectResult = await client.connect();
        if (!connectResult.success) {
            return res.json({ success: false, error: connectResult.error });
        }

        const opticalResult = await gponCommands.getOpticalPower(client);
        await client.disconnect();

        if (opticalResult.success) {
            // Cache the values
            await supabase
                .from('customer_cpe')
                .update({
                    last_optical_rx: opticalResult.data.rxPower,
                    last_optical_tx: opticalResult.data.txPower,
                    last_connected: new Date().toISOString()
                })
                .eq('customer_id', customerId);
        }

        res.json(opticalResult);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get traffic statistics
app.get('/api/customers/:id/cpe/traffic', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        const supabase = (await import('./services/database')).getSupabase();

        const { data: cpe } = await supabase
            .from('customer_cpe')
            .select('*')
            .eq('customer_id', customerId)
            .single();

        if (!cpe) {
            return res.status(404).json({ error: 'No CPE configured' });
        }

        const client = new CPETelnetClient({
            ip: cpe.cpe_ip,
            port: cpe.cpe_port,
            username: cpe.cpe_username,
            password: cpe.cpe_password,
            type: cpe.cpe_type
        });

        const connectResult = await client.connect();
        if (!connectResult.success) {
            return res.json({ success: false, error: connectResult.error });
        }

        const trafficResult = await gponCommands.getTrafficStats(client);
        await client.disconnect();

        if (trafficResult.success) {
            await supabase
                .from('customer_cpe')
                .update({
                    bytes_in: trafficResult.data.bytesIn,
                    bytes_out: trafficResult.data.bytesOut,
                    last_connected: new Date().toISOString()
                })
                .eq('customer_id', customerId);
        }

        res.json(trafficResult);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get WiFi settings
app.get('/api/customers/:id/cpe/wifi', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        const supabase = (await import('./services/database')).getSupabase();

        const { data: cpe } = await supabase
            .from('customer_cpe')
            .select('*')
            .eq('customer_id', customerId)
            .single();

        if (!cpe) {
            return res.status(404).json({ error: 'No CPE configured' });
        }

        const client = new CPETelnetClient({
            ip: cpe.cpe_ip,
            port: cpe.cpe_port,
            username: cpe.cpe_username,
            password: cpe.cpe_password,
            type: cpe.cpe_type
        });

        const connectResult = await client.connect();
        if (!connectResult.success) {
            return res.json({ success: false, error: connectResult.error });
        }

        const wifiResult = await gponCommands.getWiFiSettings(client);
        await client.disconnect();

        if (wifiResult.success) {
            await supabase
                .from('customer_cpe')
                .update({
                    wifi_ssid: wifiResult.data.ssid,
                    wifi_password: wifiResult.data.password,
                    last_connected: new Date().toISOString()
                })
                .eq('customer_id', customerId);
        }

        res.json(wifiResult);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Start Server
// ============================================

// Initialize RADIUS Server
import { RadiusServer } from './radius/server';
const radiusServer = new RadiusServer();

const server = app.listen(config.port, () => {
    logger.info(`MikroTik Service running on port ${config.port}`);

    // Start health monitor
    healthMonitor.start();

    // Start RADIUS Server
    radiusServer.start();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    healthMonitor.stop();
    await mikrotikClient.disconnectAll();
    server.close();
    process.exit(0);
});

export default app;
