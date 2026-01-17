const dgram = require('dgram');
const radius = require('radius');
const { radiusLogger: logger } = require('../utils/logger');
const { query } = require('../config/database');
const bcrypt = require('bcrypt');

class RadiusServer {
    constructor() {
        this.authSocket = dgram.createSocket('udp4');
        this.acctSocket = dgram.createSocket('udp4');
        this.secret = process.env.RADIUS_SECRET || 'testing123';
        this.authPort = parseInt(process.env.RADIUS_PORT || '1812');
        this.acctPort = parseInt(process.env.RADIUS_ACCOUNTING_PORT || '1813');
    }

    // Start RADIUS servers
    start() {
        // Authentication server
        this.authSocket.on('message', (msg, rinfo) => {
            this.handleAuthRequest(msg, rinfo);
        });

        this.authSocket.on('error', (err) => {
            logger.error('RADIUS Auth socket error:', err);
        });

        this.authSocket.bind(this.authPort, () => {
            logger.info(`RADIUS Authentication server listening on port ${this.authPort}`);
        });

        // Accounting server
        this.acctSocket.on('message', (msg, rinfo) => {
            this.handleAcctRequest(msg, rinfo);
        });

        this.acctSocket.on('error', (err) => {
            logger.error('RADIUS Accounting socket error:', err);
        });

        this.acctSocket.bind(this.acctPort, () => {
            logger.info(`RADIUS Accounting server listening on port ${this.acctPort}`);
        });
    }

    // Handle authentication requests
    async handleAuthRequest(msg, rinfo) {
        const startTime = Date.now();
        let decoded;

        try {
            // Decode RADIUS packet
            decoded = radius.decode({ packet: msg, secret: this.secret });

            const username = decoded.attributes['User-Name'];
            const password = decoded.attributes['User-Password'];
            const nasIp = rinfo.address;
            const nasIdentifier = decoded.attributes['NAS-Identifier'];
            const calledStationId = decoded.attributes['Called-Station-Id'];
            const callingStationId = decoded.attributes['Calling-Station-Id']; // MAC address

            logger.info('RADIUS Access-Request received', {
                username,
                nasIp,
                nasIdentifier,
                mac: callingStationId,
            });

            // Authenticate user
            const authResult = await this.authenticateUser(username, password, callingStationId);

            if (authResult.success) {
                // Send Access-Accept
                await this.sendAccessAccept(decoded, rinfo, authResult);
                logger.info('RADIUS Access-Accept sent', { username });
            } else {
                // Send Access-Reject
                await this.sendAccessReject(decoded, rinfo, authResult.reason);
                logger.warn('RADIUS Access-Reject sent', { username, reason: authResult.reason });
            }

            // Log to database
            await this.logRadiusRequest({
                requestType: 'Access-Request',
                packetType: authResult.success ? 'Access-Accept' : 'Access-Reject',
                username,
                userId: authResult.userId,
                nasIpAddress: nasIp,
                nasIdentifier,
                macAddress: callingStationId,
                authResult: authResult.success ? 'Accept' : 'Reject',
                rejectReason: authResult.reason,
                attributes: decoded.attributes,
                responseTimeMs: Date.now() - startTime,
            });

        } catch (error) {
            logger.error('RADIUS Auth error:', error);
            if (decoded) {
                await this.sendAccessReject(decoded, rinfo, 'Internal server error');
            }
        }
    }

    // Authenticate user or voucher
    async authenticateUser(username, password, macAddress) {
        try {
            // Try to authenticate as regular user
            let result = await query(
                `SELECT u.*, p.upload_speed, p.download_speed, p.session_timeout,
                        p.idle_timeout, p.validity_days, p.data_limit_mb
                 FROM users u
                 LEFT JOIN plans p ON u.plan_id = p.id
                 WHERE u.username = $1`,
                [username]
            );

            let user = result.rows[0];
            let isVoucher = false;

            // If not found as user, try as voucher
            if (!user) {
                result = await query(
                    `SELECT v.*, p.upload_speed, p.download_speed, p.session_timeout,
                            p.idle_timeout, p.validity_days, p.data_limit_mb
                     FROM vouchers v
                     LEFT JOIN plans p ON v.plan_id = p.id
                     WHERE v.code = $1 AND v.status = 'active'`,
                    [username]
                );

                if (result.rows.length > 0) {
                    const voucher = result.rows[0];

                    // Check if voucher has PIN and validate it
                    if (voucher.pin && voucher.pin !== password) {
                        return { success: false, reason: 'Invalid voucher PIN' };
                    }

                    // Check voucher validity
                    const now = new Date();
                    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
                        await query('UPDATE vouchers SET status = $1 WHERE id = $2', ['expired', voucher.id]);
                        return { success: false, reason: 'Voucher expired' };
                    }

                    user = voucher;
                    isVoucher = true;
                }
            }

            if (!user) {
                return { success: false, reason: 'User not found' };
            }

            // For regular users, verify password
            if (!isVoucher) {
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    return { success: false, reason: 'Invalid password' };
                }

                // Check if user is active
                if (!user.is_active) {
                    return { success: false, reason: 'Account disabled' };
                }

                // Check account validity
                if (user.valid_until && new Date(user.valid_until) < new Date()) {
                    return { success: false, reason: 'Account expired' };
                }

                // Check data limit
                if (user.data_limit_mb && user.total_data_used_mb >= user.data_limit_mb) {
                    return { success: false, reason: 'Data limit exceeded' };
                }

                // Check MAC binding if set
                if (user.mac_address && user.mac_address !== macAddress) {
                    return { success: false, reason: 'MAC address mismatch' };
                }

                // Update last login
                await query('UPDATE users SET last_login = NOW(), is_online = true WHERE id = $1', [user.id]);
            } else {
                // Mark voucher as used if first time
                if (voucher.status === 'active' && !voucher.used_at) {
                    await query(
                        'UPDATE vouchers SET status = $1, used_at = NOW() WHERE id = $2',
                        ['used', voucher.id]
                    );
                }
            }

            return {
                success: true,
                userId: user.id,
                username: isVoucher ? username : user.username,
                uploadSpeed: user.upload_speed,
                downloadSpeed: user.download_speed,
                sessionTimeout: user.session_timeout,
                idleTimeout: user.idle_timeout || 300,
                isVoucher,
            };

        } catch (error) {
            logger.error('Authentication error:', error);
            return { success: false, reason: 'Internal server error' };
        }
    }

    // Send Access-Accept with MikroTik attributes
    async sendAccessAccept(request, rinfo, authResult) {
        const response = radius.encode_response({
            packet: request,
            code: 'Access-Accept',
            secret: this.secret,
            attributes: this.buildMikroTikAttributes(authResult),
        });

        return new Promise((resolve, reject) => {
            this.authSocket.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Build MikroTik-specific RADIUS attributes
    buildMikroTikAttributes(authResult) {
        const attributes = [];

        // Mikrotik-Rate-Limit (Vendor-Specific)
        // Format: "upload/download" in bits per second
        if (authResult.uploadSpeed && authResult.downloadSpeed) {
            const uploadBps = authResult.uploadSpeed * 1024; // Convert Kbps to bps
            const downloadBps = authResult.downloadSpeed * 1024;
            const rateLimit = `${uploadBps}/${downloadBps}`;

            // MikroTik Vendor-Specific Attribute (Vendor-Id: 14988)
            attributes.push([
                'Vendor-Specific',
                14988, // MikroTik Vendor ID
                [[1, rateLimit]] // Mikrotik-Rate-Limit attribute ID is 1
            ]);
        }

        // Session-Timeout
        if (authResult.sessionTimeout) {
            attributes.push(['Session-Timeout', authResult.sessionTimeout]);
        }

        // Idle-Timeout
        if (authResult.idleTimeout) {
            attributes.push(['Idle-Timeout', authResult.idleTimeout]);
        }

        // Reply-Message
        attributes.push(['Reply-Message', 'Welcome! You are now connected.']);

        return attributes;
    }

    // Send Access-Reject
    async sendAccessReject(request, rinfo, reason) {
        const response = radius.encode_response({
            packet: request,
            code: 'Access-Reject',
            secret: this.secret,
            attributes: [
                ['Reply-Message', reason || 'Authentication failed'],
            ],
        });

        return new Promise((resolve, reject) => {
            this.authSocket.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Handle accounting requests
    async handleAcctRequest(msg, rinfo) {
        const startTime = Date.now();

        try {
            // Decode RADIUS packet
            const decoded = radius.decode({ packet: msg, secret: this.secret });

            const acctStatusType = decoded.attributes['Acct-Status-Type'];
            const username = decoded.attributes['User-Name'];
            const sessionId = decoded.attributes['Acct-Session-Id'];
            const nasIp = rinfo.address;
            const nasIdentifier = decoded.attributes['NAS-Identifier'];
            const framedIp = decoded.attributes['Framed-IP-Address'];
            const macAddress = decoded.attributes['Calling-Station-Id'];

            logger.info('RADIUS Accounting-Request received', {
                type: acctStatusType,
                username,
                sessionId,
                nasIp,
            });

            // Handle based on accounting status type
            switch (acctStatusType) {
                case 'Start':
                    await this.handleAccountingStart(decoded, rinfo);
                    break;
                case 'Interim-Update':
                    await this.handleAccountingInterimUpdate(decoded, rinfo);
                    break;
                case 'Stop':
                    await this.handleAccountingStop(decoded, rinfo);
                    break;
                default:
                    logger.warn('Unknown Acct-Status-Type:', acctStatusType);
            }

            // Send Accounting-Response
            await this.sendAccountingResponse(decoded, rinfo);

            // Log to database
            await this.logRadiusRequest({
                requestType: 'Accounting-Request',
                packetType: acctStatusType,
                username,
                sessionId,
                nasIpAddress: nasIp,
                nasIdentifier,
                framedIpAddress: framedIp,
                macAddress,
                attributes: decoded.attributes,
                responseTimeMs: Date.now() - startTime,
            });

        } catch (error) {
            logger.error('RADIUS Accounting error:', error);
        }
    }

    // Handle Accounting Start
    async handleAccountingStart(request, rinfo) {
        const username = request.attributes['User-Name'];
        const sessionId = request.attributes['Acct-Session-Id'];
        const nasIp = rinfo.address;
        const nasIdentifier = request.attributes['NAS-Identifier'];
        const nasPortId = request.attributes['NAS-Port-Id'];
        const framedIp = request.attributes['Framed-IP-Address'];
        const macAddress = request.attributes['Calling-Station-Id'];

        try {
            // Get user ID
            let result = await query('SELECT id FROM users WHERE username = $1', [username]);
            let userId = result.rows[0]?.id;

            // If not found, might be a voucher
            if (!userId) {
                result = await query('SELECT id FROM vouchers WHERE code = $1', [username]);
                userId = result.rows[0]?.id;
            }

            // Get router ID
            result = await query('SELECT id FROM routers WHERE nas_ip_address = $1 OR nas_identifier = $2',
                [nasIp, nasIdentifier]);
            const routerId = result.rows[0]?.id;

            // Create session record
            await query(
                `INSERT INTO sessions
                (session_id, user_id, username, router_id, nas_ip_address, nas_identifier,
                 nas_port_id, framed_ip_address, mac_address, start_time, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 'active')
                ON CONFLICT (session_id)
                DO UPDATE SET start_time = NOW(), status = 'active'`,
                [sessionId, userId, username, routerId, nasIp, nasIdentifier,
                 nasPortId, framedIp, macAddress]
            );

            // Update user online status
            if (userId) {
                await query('UPDATE users SET is_online = true WHERE id = $1', [userId]);
            }

            logger.info('Session started', { username, sessionId });

        } catch (error) {
            logger.error('Accounting Start error:', error);
            throw error;
        }
    }

    // Handle Accounting Interim-Update
    async handleAccountingInterimUpdate(request, rinfo) {
        const sessionId = request.attributes['Acct-Session-Id'];
        const username = request.attributes['User-Name'];
        const sessionTime = request.attributes['Acct-Session-Time'] || 0;
        const inputOctets = request.attributes['Acct-Input-Octets'] || 0;
        const outputOctets = request.attributes['Acct-Output-Octets'] || 0;
        const inputGigawords = request.attributes['Acct-Input-Gigawords'] || 0;
        const outputGigawords = request.attributes['Acct-Output-Gigawords'] || 0;
        const inputPackets = request.attributes['Acct-Input-Packets'] || 0;
        const outputPackets = request.attributes['Acct-Output-Packets'] || 0;

        try {
            // Calculate total bytes (including gigawords)
            const totalInputOctets = (BigInt(inputGigawords) * BigInt(4294967296)) + BigInt(inputOctets);
            const totalOutputOctets = (BigInt(outputGigawords) * BigInt(4294967296)) + BigInt(outputOctets);

            // Update session
            await query(
                `UPDATE sessions
                 SET session_duration = $1,
                     input_octets = $2,
                     output_octets = $3,
                     input_gigawords = $4,
                     output_gigawords = $5,
                     input_packets = $6,
                     output_packets = $7,
                     last_update = NOW()
                 WHERE session_id = $8`,
                [sessionTime, totalInputOctets.toString(), totalOutputOctets.toString(),
                 inputGigawords, outputGigawords, inputPackets, outputPackets, sessionId]
            );

            // Update user total usage
            const totalMB = Number(totalInputOctets + totalOutputOctets) / (1024 * 1024);
            await query(
                `UPDATE users
                 SET total_data_used_mb = total_data_used_mb + $1,
                     total_session_time = total_session_time + $2
                 FROM sessions
                 WHERE users.id = sessions.user_id
                   AND sessions.session_id = $3`,
                [totalMB, sessionTime, sessionId]
            );

            logger.debug('Session updated', {
                username,
                sessionId,
                duration: sessionTime,
                uploadMB: Number(totalInputOctets) / (1024 * 1024),
                downloadMB: Number(totalOutputOctets) / (1024 * 1024)
            });

        } catch (error) {
            logger.error('Accounting Interim-Update error:', error);
            throw error;
        }
    }

    // Handle Accounting Stop
    async handleAccountingStop(request, rinfo) {
        const sessionId = request.attributes['Acct-Session-Id'];
        const username = request.attributes['User-Name'];
        const sessionTime = request.attributes['Acct-Session-Time'] || 0;
        const inputOctets = request.attributes['Acct-Input-Octets'] || 0;
        const outputOctets = request.attributes['Acct-Output-Octets'] || 0;
        const inputGigawords = request.attributes['Acct-Input-Gigawords'] || 0;
        const outputGigawords = request.attributes['Acct-Output-Gigawords'] || 0;
        const inputPackets = request.attributes['Acct-Input-Packets'] || 0;
        const outputPackets = request.attributes['Acct-Output-Packets'] || 0;
        const terminateCause = request.attributes['Acct-Terminate-Cause'];

        try {
            // Calculate total bytes
            const totalInputOctets = (BigInt(inputGigawords) * BigInt(4294967296)) + BigInt(inputOctets);
            const totalOutputOctets = (BigInt(outputGigawords) * BigInt(4294967296)) + BigInt(outputOctets);

            // Update session - mark as stopped
            await query(
                `UPDATE sessions
                 SET session_duration = $1,
                     input_octets = $2,
                     output_octets = $3,
                     input_gigawords = $4,
                     output_gigawords = $5,
                     input_packets = $6,
                     output_packets = $7,
                     stop_time = NOW(),
                     status = 'stopped',
                     terminate_cause = $8
                 WHERE session_id = $9`,
                [sessionTime, totalInputOctets.toString(), totalOutputOctets.toString(),
                 inputGigawords, outputGigawords, inputPackets, outputPackets,
                 terminateCause, sessionId]
            );

            // Update user online status
            const result = await query('SELECT user_id FROM sessions WHERE session_id = $1', [sessionId]);
            const userId = result.rows[0]?.user_id;

            if (userId) {
                // Check if user has any other active sessions
                const activeSessionsResult = await query(
                    'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND status = $2',
                    [userId, 'active']
                );

                if (parseInt(activeSessionsResult.rows[0].count) === 0) {
                    await query('UPDATE users SET is_online = false WHERE id = $1', [userId]);
                }
            }

            logger.info('Session stopped', {
                username,
                sessionId,
                duration: sessionTime,
                terminateCause
            });

        } catch (error) {
            logger.error('Accounting Stop error:', error);
            throw error;
        }
    }

    // Send Accounting-Response
    async sendAccountingResponse(request, rinfo) {
        const response = radius.encode_response({
            packet: request,
            code: 'Accounting-Response',
            secret: this.secret,
        });

        return new Promise((resolve, reject) => {
            this.acctSocket.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Log RADIUS request to database
    async logRadiusRequest(data) {
        try {
            await query(
                `INSERT INTO radius_logs
                (request_type, packet_type, username, user_id, session_id,
                 nas_ip_address, nas_identifier, nas_port_id, framed_ip_address,
                 mac_address, auth_result, reject_reason, attributes,
                 response_attributes, response_time_ms)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [
                    data.requestType,
                    data.packetType,
                    data.username,
                    data.userId,
                    data.sessionId,
                    data.nasIpAddress,
                    data.nasIdentifier,
                    data.nasPortId,
                    data.framedIpAddress,
                    data.macAddress,
                    data.authResult,
                    data.rejectReason,
                    JSON.stringify(data.attributes),
                    JSON.stringify(data.responseAttributes),
                    data.responseTimeMs,
                ]
            );
        } catch (error) {
            logger.error('Failed to log RADIUS request:', error);
        }
    }

    // Stop servers
    stop() {
        this.authSocket.close();
        this.acctSocket.close();
        logger.info('RADIUS servers stopped');
    }
}

module.exports = RadiusServer;
