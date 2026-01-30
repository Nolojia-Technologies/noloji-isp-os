import radius from 'radius';
import dgram from 'dgram';
import { db } from '../services/database';
import { billingEnforcement } from '../services/billing-enforcement';
import logger from '../utils/logger';
import config from '../config';

const AUTH_PORT = 1812;
const ACCT_PORT = 1813;
const SHARED_SECRET = process.env.RADIUS_SECRET || 'testing123';

export class RadiusServer {
    private authSocket: dgram.Socket;
    private acctSocket: dgram.Socket;

    constructor() {
        this.authSocket = dgram.createSocket('udp4');
        this.acctSocket = dgram.createSocket('udp4');
    }

    public start() {
        // Authentication Server
        this.authSocket.on('message', async (msg, rinfo) => {
            try {
                const packet = radius.decode({ packet: msg, secret: SHARED_SECRET });

                if (packet.code !== 'Access-Request') {
                    // Ignore non-requests
                    return;
                }

                const username = packet.attributes['User-Name'];
                const password = packet.attributes['User-Password'];
                const nasIp = packet.attributes['NAS-IP-Address'];

                logger.info(`RADIUS Auth Request for ${username} from ${nasIp}`);

                let code = 'Access-Reject';
                const attributes: any = {};

                // Authenticate against DB
                const customer = await db.getCustomerByUsername(username);

                if (customer) {
                    // Update router health if linked
                    if (customer.router_id) {
                        // We can't easily import 'db' directly if it's circular, but here it is imported.
                        // Update router to online.
                        const { error } = await (await import('../services/database')).getSupabase()
                            .from('routers')
                            .update({
                                status: 'online',
                                last_health_check: new Date().toISOString()
                            })
                            .eq('id', customer.router_id);
                    }

                    if (customer.password === password) {
                        if (customer.is_active) {
                            code = 'Access-Accept';
                            if (customer.plans) {
                                if (customer.mikrotik_profile) {
                                    attributes['Filter-Id'] = customer.mikrotik_profile;
                                }
                            }
                        } else {
                            logger.warn(`RADIUS: Account suspended for ${username}`);
                        }
                    } else {
                        logger.warn(`RADIUS: Wrong password for ${username}`);
                    }
                } else {
                    logger.warn(`RADIUS: User not found ${username}`);
                }

                const response = radius.encode({
                    identifier: packet.identifier,
                    code: code,
                    secret: SHARED_SECRET,
                    attributes: attributes
                });

                this.authSocket.send(response, rinfo.port, rinfo.address);

            } catch (e: any) {
                logger.error('RADIUS Auth Error', { error: e.message });
            }
        });

        // Accounting Server
        this.acctSocket.on('message', async (msg, rinfo) => {
            try {
                const packet = radius.decode({ packet: msg, secret: SHARED_SECRET });

                if (packet.code !== 'Accounting-Request') {
                    return;
                }

                const username = packet.attributes['User-Name'];
                const statusType = packet.attributes['Acct-Status-Type'];
                const inputOctets = parseInt(packet.attributes['Acct-Input-Octets'] || '0');
                const outputOctets = parseInt(packet.attributes['Acct-Output-Octets'] || '0');
                const sessionId = packet.attributes['Acct-Session-Id'];

                logger.info(`RADIUS Acct ${statusType} for ${username}`);

                // Send response immediately
                const response = radius.encode({
                    identifier: packet.identifier,
                    code: 'Accounting-Response',
                    secret: SHARED_SECRET
                });
                this.acctSocket.send(response, rinfo.port, rinfo.address);

                // Process updates
                if (username) {
                    const customer = await db.getCustomerByUsername(username);
                    if (customer) {
                        const supabase = (await import('../services/database')).getSupabase();

                        // Mark router as online since we got a packet from it (via this customer)
                        if (customer.router_id) {
                            await supabase.from('routers')
                                .update({
                                    status: 'online',
                                    last_health_check: new Date().toISOString()
                                })
                                .eq('id', customer.router_id);
                        }

                        if (statusType === 'Start') {
                            await supabase.from('customers').update({ is_online: true }).eq('id', customer.id);
                            logger.info(`RADIUS: ${username} connected`);
                        } else if (statusType === 'Stop') {
                            // Update usage
                            // Calculate diff? Or Mikrotik sends total for session?
                            // RADIUS sends total for session. We should add this to total_data_used_mb?
                            // This depends on if we track session or cumulative.
                            // For simplicity, let's mark offline.
                            await supabase.from('customers').update({ is_online: false }).eq('id', customer.id);
                            logger.info(`RADIUS: ${username} disconnected`);
                        } else if (statusType === 'Interim-Update') {
                            // Update usage stats and ensure user is marked online
                            await supabase.from('customers').update({ is_online: true }).eq('id', customer.id);
                            logger.info(`RADIUS: ${username} interim update`);
                            // await billingEnforcement.updateUsage(customer.id, inputOctets, outputOctets);
                        }
                    }
                }

            } catch (e: any) {
                logger.error('RADIUS Acct Error', { error: e.message });
            }
        });

        // Helper to update router status
        const updateRouterStatus = async (ip: string) => {
            try {
                // Find router by IP (host) or by checking connected customers?
                // Since this is NATed IP potentially, it might not match the DB host IP.
                // However, we can try to find the router that owns this customer (if authenticated).
                // Or if the router actually sends a NAS-Identifier matching the router name/identity.

                // For now, let's update router health if we found the customer and they have a router_id
                // This is safer than relying on IP which might be dynamic/NAT.
                // See usage below in message handlers.
            } catch (e) {
                // Ignore
            }
        };

        this.authSocket.bind(AUTH_PORT, () => logger.info(`RADIUS Auth listening on UDP ${AUTH_PORT}`));
        this.acctSocket.bind(ACCT_PORT, () => logger.info(`RADIUS Acct listening on UDP ${ACCT_PORT}`));
    }
}
