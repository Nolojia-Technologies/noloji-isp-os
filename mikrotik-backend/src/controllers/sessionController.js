const { query } = require('../config/database');
const logger = require('../utils/logger');

// Get all active sessions
exports.getActiveSessions = async (req, res) => {
    try {
        const result = await query(`
            SELECT s.*, u.full_name, p.name as plan_name
            FROM sessions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE s.status = 'active'
            ORDER BY s.start_time DESC
        `);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching active sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all sessions (with filtering)
exports.getAllSessions = async (req, res) => {
    try {
        const { username, status, limit = 100 } = req.query;

        let sql = `
            SELECT s.*, u.full_name, p.name as plan_name
            FROM sessions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (username) {
            params.push(username);
            sql += ` AND s.username = $${params.length}`;
        }

        if (status) {
            params.push(status);
            sql += ` AND s.status = $${params.length}`;
        }

        params.push(parseInt(limit));
        sql += ` ORDER BY s.start_time DESC LIMIT $${params.length}`;

        const result = await query(sql, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching sessions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get session by ID
exports.getSessionById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT s.*, u.full_name, u.email, p.name as plan_name
            FROM sessions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE s.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        logger.error('Error fetching session:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get session statistics
exports.getSessionStats = async (req, res) => {
    try {
        const { period = '24h' } = req.query;

        // Determine time interval
        let interval = '24 hours';
        if (period === '7d') interval = '7 days';
        else if (period === '30d') interval = '30 days';

        const result = await query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'stopped') as stopped,
                COUNT(*) FILTER (WHERE status = 'timeout') as timeout,
                COUNT(*) as total,
                SUM(session_duration) as total_duration,
                SUM(input_octets + output_octets) as total_bytes,
                AVG(session_duration) as avg_duration
            FROM sessions
            WHERE start_time > NOW() - INTERVAL '${interval}'
        `);

        const stats = result.rows[0];

        // Format bytes to GB
        if (stats.total_bytes) {
            stats.total_gb = (parseInt(stats.total_bytes) / (1024 * 1024 * 1024)).toFixed(2);
        }

        // Format duration to hours
        if (stats.total_duration) {
            stats.total_hours = (parseInt(stats.total_duration) / 3600).toFixed(2);
        }

        if (stats.avg_duration) {
            stats.avg_minutes = (parseInt(stats.avg_duration) / 60).toFixed(2);
        }

        res.json({
            success: true,
            period,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching session stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get online users count
exports.getOnlineUsersCount = async (req, res) => {
    try {
        const result = await query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE is_online = true
        `);

        res.json({
            success: true,
            count: parseInt(result.rows[0].count)
        });

    } catch (error) {
        logger.error('Error fetching online users count:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get RADIUS logs
exports.getRadiusLogs = async (req, res) => {
    try {
        const { username, request_type, limit = 100 } = req.query;

        let sql = `
            SELECT *
            FROM radius_logs
            WHERE 1=1
        `;
        const params = [];

        if (username) {
            params.push(username);
            sql += ` AND username = $${params.length}`;
        }

        if (request_type) {
            params.push(request_type);
            sql += ` AND request_type = $${params.length}`;
        }

        params.push(parseInt(limit));
        sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

        const result = await query(sql, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching RADIUS logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
