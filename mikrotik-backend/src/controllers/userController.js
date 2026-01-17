const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const routerMikrotikService = require('../services/routerMikrotikService');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const { connection_type, is_active, router_id, search, limit = 100, offset = 0 } = req.query;

        let sql = `
            SELECT u.id, u.username, u.email, u.phone, u.full_name,
                   u.is_active, u.is_online, u.valid_from, u.valid_until,
                   u.total_data_used_mb, u.total_session_time, u.mac_address,
                   u.last_login, u.created_at, u.connection_type, u.address, u.id_number,
                   p.name as plan_name, p.id as plan_id,
                   r.name as router_name, r.id as router_id,
                   CASE
                       WHEN u.valid_until IS NULL THEN 'ACTIVE'
                       WHEN u.valid_until < CURRENT_TIMESTAMP THEN 'EXPIRED'
                       ELSE 'ACTIVE'
                   END as status
            FROM users u
            LEFT JOIN plans p ON u.plan_id = p.id
            LEFT JOIN routers r ON u.router_id = r.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        // Filter by connection type
        if (connection_type) {
            sql += ` AND u.connection_type = $${paramCount++}`;
            params.push(connection_type.toUpperCase());
        }

        // Filter by active status
        if (is_active !== undefined) {
            sql += ` AND u.is_active = $${paramCount++}`;
            params.push(is_active === 'true');
        }

        // Filter by router
        if (router_id) {
            sql += ` AND u.router_id = $${paramCount++}`;
            params.push(router_id);
        }

        // Search by username, full_name, phone, or email
        if (search) {
            sql += ` AND (
                u.username ILIKE $${paramCount} OR
                u.full_name ILIKE $${paramCount} OR
                u.phone ILIKE $${paramCount} OR
                u.email ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
            paramCount++;
        }

        sql += ` ORDER BY u.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as count FROM users u WHERE 1=1';
        const countParams = [];
        let countParamNum = 1;

        if (connection_type) {
            countSql += ` AND u.connection_type = $${countParamNum++}`;
            countParams.push(connection_type.toUpperCase());
        }

        if (is_active !== undefined) {
            countSql += ` AND u.is_active = $${countParamNum++}`;
            countParams.push(is_active === 'true');
        }

        if (router_id) {
            countSql += ` AND u.router_id = $${countParamNum++}`;
            countParams.push(router_id);
        }

        if (search) {
            countSql += ` AND (
                u.username ILIKE $${countParamNum} OR
                u.full_name ILIKE $${countParamNum} OR
                u.phone ILIKE $${countParamNum} OR
                u.email ILIKE $${countParamNum}
            )`;
            countParams.push(`%${search}%`);
        }

        const countResult = await query(countSql, countParams);

        res.json({
            success: true,
            count: result.rows.length,
            total: parseInt(countResult.rows[0].count),
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT u.*, p.name as plan_name, p.upload_speed, p.download_speed
            FROM users u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        logger.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create new user
exports.createUser = async (req, res) => {
    try {
        const {
            username, password, email, phone, full_name,
            plan_id, valid_until, mac_address, notes,
            connection_type, address, id_number, router_id
        } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Check if username already exists
        const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10'));

        // Insert user
        const result = await query(`
            INSERT INTO users
            (username, password, email, phone, full_name, plan_id, valid_until, mac_address, notes,
             connection_type, address, id_number, router_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, username, email, created_at
        `, [username, hashedPassword, email, phone, full_name, plan_id, valid_until, mac_address, notes,
            connection_type || 'HOTSPOT', address, id_number, router_id]);

        logger.info('User created in database:', { username, id: result.rows[0].id });

        // Create user in MikroTik if router is specified and connection type is HOTSPOT
        let mikrotikResult = { success: false, message: 'Not created in MikroTik (no router specified)' };
        if (router_id && (connection_type || 'HOTSPOT') === 'HOTSPOT') {
            try {
                // Get plan name for comment
                let planName = '';
                if (plan_id) {
                    const planResult = await query('SELECT name FROM plans WHERE id = $1', [plan_id]);
                    if (planResult.rows.length > 0) {
                        planName = planResult.rows[0].name;
                    }
                }

                mikrotikResult = await routerMikrotikService.createHotspotUser(
                    router_id,
                    username,
                    password, // Use plain password for MikroTik
                    'default', // Default profile, can be customized based on plan
                    planName
                );

                logger.info('User created in MikroTik:', { username, routerId: router_id, success: mikrotikResult.success });
            } catch (error) {
                logger.error('Failed to create user in MikroTik (continuing anyway):', error.message);
                mikrotikResult = { success: false, error: error.message };
            }
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.rows[0],
            mikrotik: mikrotikResult
        });

    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            email, phone, full_name, plan_id, is_active,
            valid_until, mac_address, notes, password,
            connection_type, address, id_number, router_id
        } = req.body;

        // Check if user exists
        const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            values.push(phone);
        }
        if (full_name !== undefined) {
            updates.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }
        if (plan_id !== undefined) {
            updates.push(`plan_id = $${paramIndex++}`);
            values.push(plan_id);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        if (valid_until !== undefined) {
            updates.push(`valid_until = $${paramIndex++}`);
            values.push(valid_until);
        }
        if (mac_address !== undefined) {
            updates.push(`mac_address = $${paramIndex++}`);
            values.push(mac_address);
        }
        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            values.push(notes);
        }
        if (connection_type !== undefined) {
            updates.push(`connection_type = $${paramIndex++}`);
            values.push(connection_type);
        }
        if (address !== undefined) {
            updates.push(`address = $${paramIndex++}`);
            values.push(address);
        }
        if (id_number !== undefined) {
            updates.push(`id_number = $${paramIndex++}`);
            values.push(id_number);
        }
        if (router_id !== undefined) {
            updates.push(`router_id = $${paramIndex++}`);
            values.push(router_id);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10'));
            updates.push(`password = $${paramIndex++}`);
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        values.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

        const result = await query(sql, values);

        logger.info('User updated:', { id, username: result.rows[0].username });

        res.json({
            success: true,
            message: 'User updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Get user info before deleting
        const userInfo = await query(
            'SELECT username, router_id, connection_type FROM users WHERE id = $1',
            [id]
        );

        if (userInfo.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const { username, router_id, connection_type } = userInfo.rows[0];

        // Delete from database
        await query('DELETE FROM users WHERE id = $1', [id]);

        logger.info('User deleted from database:', { id, username });

        // Delete from MikroTik if it was a hotspot user
        let mikrotikResult = { success: false, message: 'Not deleted from MikroTik' };
        if (router_id && connection_type === 'HOTSPOT') {
            try {
                mikrotikResult = await routerMikrotikService.removeHotspotUser(router_id, username);
                logger.info('User deleted from MikroTik:', { username, routerId: router_id, success: mikrotikResult.success });
            } catch (error) {
                logger.error('Failed to delete user from MikroTik (continuing anyway):', error.message);
                mikrotikResult = { success: false, error: error.message };
            }
        }

        res.json({
            success: true,
            message: 'User deleted successfully',
            mikrotik: mikrotikResult
        });

    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get user sessions
exports.getUserSessions = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT s.*,
                   (s.input_octets + s.output_octets) as total_bytes
            FROM sessions s
            WHERE s.user_id = $1
            ORDER BY s.start_time DESC
            LIMIT 100
        `, [id]);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching user sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
