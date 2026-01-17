const { query } = require('../config/database');
const logger = require('../utils/logger');

// Get all plans
exports.getAllPlans = async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM plans
            ORDER BY price ASC
        `);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching plans:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get plan by ID
exports.getPlanById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query('SELECT * FROM plans WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Plan not found' });
        }

        // Get user count for this plan
        const userCount = await query(
            'SELECT COUNT(*) as count FROM users WHERE plan_id = $1',
            [id]
        );

        const plan = result.rows[0];
        plan.user_count = parseInt(userCount.rows[0].count);

        res.json({ success: true, data: plan });

    } catch (error) {
        logger.error('Error fetching plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create new plan
exports.createPlan = async (req, res) => {
    try {
        const {
            name, description, upload_speed, download_speed,
            session_timeout, idle_timeout, validity_days,
            data_limit_mb, price, currency, is_active
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Plan name is required'
            });
        }

        // Check if plan name already exists
        const existing = await query('SELECT id FROM plans WHERE name = $1', [name]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Plan name already exists'
            });
        }

        const result = await query(`
            INSERT INTO plans
            (name, description, upload_speed, download_speed, session_timeout,
             idle_timeout, validity_days, data_limit_mb, price, currency, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [name, description, upload_speed, download_speed, session_timeout,
            idle_timeout, validity_days, data_limit_mb, price, currency, is_active]);

        logger.info('Plan created:', { name, id: result.rows[0].id });

        res.status(201).json({
            success: true,
            message: 'Plan created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error creating plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update plan
exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, upload_speed, download_speed,
            session_timeout, idle_timeout, validity_days,
            data_limit_mb, price, currency, is_active
        } = req.body;

        // Check if plan exists
        const existing = await query('SELECT id FROM plans WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Plan not found' });
        }

        const result = await query(`
            UPDATE plans
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                upload_speed = COALESCE($3, upload_speed),
                download_speed = COALESCE($4, download_speed),
                session_timeout = COALESCE($5, session_timeout),
                idle_timeout = COALESCE($6, idle_timeout),
                validity_days = COALESCE($7, validity_days),
                data_limit_mb = COALESCE($8, data_limit_mb),
                price = COALESCE($9, price),
                currency = COALESCE($10, currency),
                is_active = COALESCE($11, is_active)
            WHERE id = $12
            RETURNING *
        `, [name, description, upload_speed, download_speed, session_timeout,
            idle_timeout, validity_days, data_limit_mb, price, currency, is_active, id]);

        logger.info('Plan updated:', { id, name: result.rows[0].name });

        res.json({
            success: true,
            message: 'Plan updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete plan
exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if plan has users
        const userCount = await query(
            'SELECT COUNT(*) as count FROM users WHERE plan_id = $1',
            [id]
        );

        if (parseInt(userCount.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete plan with active users'
            });
        }

        const result = await query('DELETE FROM plans WHERE id = $1 RETURNING name', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Plan not found' });
        }

        logger.info('Plan deleted:', { id, name: result.rows[0].name });

        res.json({
            success: true,
            message: 'Plan deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting plan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
