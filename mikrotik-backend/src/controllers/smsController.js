const { query } = require('../config/database');
const logger = require('../utils/logger');

// Get SMS credit balance
exports.getSMSBalance = async (req, res) => {
    try {
        const result = await query('SELECT * FROM sms_credits ORDER BY id DESC LIMIT 1');

        if (result.rows.length === 0) {
            // Create initial record if not exists
            await query(`
                INSERT INTO sms_credits (balance, cost_per_sms, currency)
                VALUES (0, 0.50, 'KES')
            `);

            const newResult = await query('SELECT * FROM sms_credits ORDER BY id DESC LIMIT 1');
            return res.json({ success: true, data: newResult.rows[0] });
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        logger.error('Error fetching SMS balance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Add SMS credits (when purchasing bulk SMS)
exports.addSMSCredits = async (req, res) => {
    try {
        const { amount, cost_per_sms } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be greater than 0'
            });
        }

        // Get current credits
        const current = await query('SELECT * FROM sms_credits ORDER BY id DESC LIMIT 1');

        if (current.rows.length === 0) {
            // Create new record
            const result = await query(`
                INSERT INTO sms_credits
                (balance, cost_per_sms, currency, last_purchase_date, last_purchase_amount)
                VALUES ($1, $2, 'KES', CURRENT_TIMESTAMP, $1)
                RETURNING *
            `, [amount, cost_per_sms || 0.50]);

            logger.info('SMS credits initialized:', { amount });
            return res.json({
                success: true,
                message: `Added ${amount} SMS credits`,
                data: result.rows[0]
            });
        }

        // Update existing record
        const result = await query(`
            UPDATE sms_credits
            SET balance = balance + $1,
                cost_per_sms = COALESCE($2, cost_per_sms),
                last_purchase_date = CURRENT_TIMESTAMP,
                last_purchase_amount = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [amount, cost_per_sms, current.rows[0].id]);

        logger.info('SMS credits added:', { amount, new_balance: result.rows[0].balance });

        res.json({
            success: true,
            message: `Added ${amount} SMS credits. New balance: ${result.rows[0].balance}`,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error adding SMS credits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update SMS pricing
exports.updateSMSPricing = async (req, res) => {
    try {
        const { cost_per_sms, currency } = req.body;

        if (!cost_per_sms || cost_per_sms <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Cost per SMS must be greater than 0'
            });
        }

        const result = await query(`
            UPDATE sms_credits
            SET cost_per_sms = $1,
                currency = COALESCE($2, currency),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM sms_credits ORDER BY id DESC LIMIT 1)
            RETURNING *
        `, [cost_per_sms, currency]);

        logger.info('SMS pricing updated:', { cost_per_sms, currency });

        res.json({
            success: true,
            message: 'SMS pricing updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating SMS pricing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Send SMS
exports.sendSMS = async (req, res) => {
    try {
        const { recipient, message, user_id, sender_id } = req.body;

        if (!recipient || !message) {
            return res.status(400).json({
                success: false,
                error: 'Recipient and message are required'
            });
        }

        // Check SMS balance
        const credits = await query('SELECT * FROM sms_credits ORDER BY id DESC LIMIT 1');

        if (credits.rows.length === 0 || credits.rows[0].balance <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Insufficient SMS credits'
            });
        }

        // Calculate credits needed (1 SMS = 160 chars, more chars = more credits)
        const creditsNeeded = Math.ceil(message.length / 160);

        if (credits.rows[0].balance < creditsNeeded) {
            return res.status(400).json({
                success: false,
                error: `Insufficient credits. Need ${creditsNeeded}, available ${credits.rows[0].balance}`
            });
        }

        // Log SMS
        const logResult = await query(`
            INSERT INTO sms_logs
            (recipient, message, user_id, status, credits_used, sender_id)
            VALUES ($1, $2, $3, 'PENDING', $4, $5)
            RETURNING *
        `, [recipient, message, user_id, creditsNeeded, sender_id || 'NOLOJI']);

        // Deduct credits
        await query(`
            UPDATE sms_credits
            SET balance = balance - $1,
                used = used + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [creditsNeeded, credits.rows[0].id]);

        // In a real system, this would integrate with an SMS API (like Africa's Talking, Twilio, etc.)
        // For now, we'll mark it as SENT
        await query(`
            UPDATE sms_logs
            SET status = 'SENT', sent_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [logResult.rows[0].id]);

        logger.info('SMS sent:', { recipient, credits_used: creditsNeeded });

        res.json({
            success: true,
            message: 'SMS sent successfully',
            data: {
                ...logResult.rows[0],
                status: 'SENT',
                remaining_balance: credits.rows[0].balance - creditsNeeded
            }
        });

    } catch (error) {
        logger.error('Error sending SMS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Send bulk SMS
exports.sendBulkSMS = async (req, res) => {
    try {
        const { recipients, message, sender_id } = req.body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Recipients array is required'
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Check SMS balance
        const credits = await query('SELECT * FROM sms_credits ORDER BY id DESC LIMIT 1');

        const creditsPerSMS = Math.ceil(message.length / 160);
        const totalCreditsNeeded = recipients.length * creditsPerSMS;

        if (credits.rows.length === 0 || credits.rows[0].balance < totalCreditsNeeded) {
            return res.status(400).json({
                success: false,
                error: `Insufficient credits. Need ${totalCreditsNeeded}, available ${credits.rows[0].balance}`
            });
        }

        const results = [];

        // Send to all recipients
        for (const recipient of recipients) {
            const logResult = await query(`
                INSERT INTO sms_logs
                (recipient, message, status, credits_used, sender_id, sent_at)
                VALUES ($1, $2, 'SENT', $3, $4, CURRENT_TIMESTAMP)
                RETURNING *
            `, [recipient, message, creditsPerSMS, sender_id || 'NOLOJI']);

            results.push(logResult.rows[0]);
        }

        // Deduct credits
        await query(`
            UPDATE sms_credits
            SET balance = balance - $1,
                used = used + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [totalCreditsNeeded, credits.rows[0].id]);

        logger.info('Bulk SMS sent:', { count: recipients.length, credits_used: totalCreditsNeeded });

        res.json({
            success: true,
            message: `Sent ${recipients.length} SMS successfully`,
            data: {
                sent_count: recipients.length,
                credits_used: totalCreditsNeeded,
                remaining_balance: credits.rows[0].balance - totalCreditsNeeded
            }
        });

    } catch (error) {
        logger.error('Error sending bulk SMS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get SMS logs
exports.getSMSLogs = async (req, res) => {
    try {
        const { user_id, status, limit = 100, offset = 0 } = req.query;

        let sql = 'SELECT l.*, u.full_name as user_name, u.username FROM sms_logs l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (user_id) {
            sql += ` AND l.user_id = $${paramCount++}`;
            params.push(user_id);
        }

        if (status) {
            sql += ` AND l.status = $${paramCount++}`;
            params.push(status);
        }

        sql += ` ORDER BY l.sent_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);

        // Get total count
        let countSql = 'SELECT COUNT(*) as count FROM sms_logs WHERE 1=1';
        const countParams = [];
        let countParamNum = 1;

        if (user_id) {
            countSql += ` AND user_id = $${countParamNum++}`;
            countParams.push(user_id);
        }

        if (status) {
            countSql += ` AND status = $${countParamNum++}`;
            countParams.push(status);
        }

        const countResult = await query(countSql, countParams);

        res.json({
            success: true,
            count: result.rows.length,
            total: parseInt(countResult.rows[0].count),
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching SMS logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get SMS statistics
exports.getSMSStats = async (req, res) => {
    try {
        const stats = await query(`
            SELECT
                COUNT(*) as total_sent,
                COUNT(CASE WHEN status = 'SENT' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
                SUM(credits_used) as total_credits_used,
                COUNT(DISTINCT recipient) as unique_recipients
            FROM sms_logs
        `);

        const credits = await query('SELECT * FROM sms_credits ORDER BY id DESC LIMIT 1');

        res.json({
            success: true,
            data: {
                ...stats.rows[0],
                current_balance: credits.rows[0]?.balance || 0,
                cost_per_sms: credits.rows[0]?.cost_per_sms || 0,
                currency: credits.rows[0]?.currency || 'KES'
            }
        });

    } catch (error) {
        logger.error('Error fetching SMS stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get SMS templates
exports.getSMSTemplates = async (req, res) => {
    try {
        const { category, is_active } = req.query;

        let sql = 'SELECT * FROM sms_templates WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (category) {
            sql += ` AND category = $${paramCount++}`;
            params.push(category);
        }

        if (is_active !== undefined) {
            sql += ` AND is_active = $${paramCount++}`;
            params.push(is_active === 'true');
        }

        sql += ' ORDER BY category, name';

        const result = await query(sql, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching SMS templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create SMS template
exports.createSMSTemplate = async (req, res) => {
    try {
        const { name, description, template, category, is_active } = req.body;

        if (!name || !template) {
            return res.status(400).json({
                success: false,
                error: 'Name and template are required'
            });
        }

        const result = await query(`
            INSERT INTO sms_templates (name, description, template, category, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, description, template, category, is_active !== false]);

        logger.info('SMS template created:', { name });

        res.status(201).json({
            success: true,
            message: 'SMS template created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error creating SMS template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update SMS template
exports.updateSMSTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, template, category, is_active } = req.body;

        const result = await query(`
            UPDATE sms_templates
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                template = COALESCE($3, template),
                category = COALESCE($4, category),
                is_active = COALESCE($5, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [name, description, template, category, is_active, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        logger.info('SMS template updated:', { id });

        res.json({
            success: true,
            message: 'SMS template updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating SMS template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete SMS template
exports.deleteSMSTemplate = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM sms_templates WHERE id = $1 RETURNING name', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        logger.info('SMS template deleted:', { id });

        res.json({
            success: true,
            message: 'SMS template deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting SMS template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
