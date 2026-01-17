const { query } = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Generate random voucher code
function generateVoucherCode(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get all vouchers
exports.getAllVouchers = async (req, res) => {
    try {
        const { status, batch_id } = req.query;

        let sql = `
            SELECT v.*, p.name as plan_name
            FROM vouchers v
            LEFT JOIN plans p ON v.plan_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            sql += ` AND v.status = $${params.length}`;
        }

        if (batch_id) {
            params.push(batch_id);
            sql += ` AND v.batch_id = $${params.length}`;
        }

        sql += ' ORDER BY v.created_at DESC';

        const result = await query(sql, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching vouchers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Generate vouchers in batch
exports.generateVouchers = async (req, res) => {
    try {
        const {
            plan_id,
            quantity = 1,
            validity_days,
            batch_name,
            notes,
            code_length = 12,
            include_pin = false
        } = req.body;

        if (!plan_id) {
            return res.status(400).json({
                success: false,
                error: 'plan_id is required'
            });
        }

        if (quantity < 1 || quantity > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Quantity must be between 1 and 1000'
            });
        }

        const batch_id = batch_name || `BATCH-${Date.now()}`;
        const vouchers = [];

        // Generate vouchers
        for (let i = 0; i < quantity; i++) {
            const code = generateVoucherCode(code_length);
            const pin = include_pin ? Math.floor(1000 + Math.random() * 9000).toString() : null;

            let valid_until = null;
            if (validity_days) {
                const validUntil = new Date();
                validUntil.setDate(validUntil.getDate() + validity_days);
                valid_until = validUntil.toISOString();
            }

            const result = await query(`
                INSERT INTO vouchers (code, pin, plan_id, batch_id, valid_until, notes)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [code, pin, plan_id, batch_id, valid_until, notes]);

            vouchers.push(result.rows[0]);
        }

        logger.info('Vouchers generated:', { batch_id, quantity });

        res.status(201).json({
            success: true,
            message: `${quantity} voucher(s) generated successfully`,
            batch_id,
            data: vouchers
        });

    } catch (error) {
        logger.error('Error generating vouchers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get voucher by code
exports.getVoucherByCode = async (req, res) => {
    try {
        const { code } = req.params;

        const result = await query(`
            SELECT v.*, p.name as plan_name, p.upload_speed, p.download_speed,
                   p.session_timeout, p.validity_days
            FROM vouchers v
            LEFT JOIN plans p ON v.plan_id = p.id
            WHERE v.code = $1
        `, [code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Voucher not found' });
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        logger.error('Error fetching voucher:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update voucher status
exports.updateVoucherStatus = async (req, res) => {
    try {
        const { code } = req.params;
        const { status } = req.body;

        const validStatuses = ['active', 'used', 'expired', 'disabled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: active, used, expired, disabled'
            });
        }

        const result = await query(
            'UPDATE vouchers SET status = $1 WHERE code = $2 RETURNING *',
            [status, code]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Voucher not found' });
        }

        logger.info('Voucher status updated:', { code, status });

        res.json({
            success: true,
            message: 'Voucher status updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating voucher:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete voucher
exports.deleteVoucher = async (req, res) => {
    try {
        const { code } = req.params;

        const result = await query('DELETE FROM vouchers WHERE code = $1 RETURNING code', [code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Voucher not found' });
        }

        logger.info('Voucher deleted:', { code });

        res.json({
            success: true,
            message: 'Voucher deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting voucher:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get voucher statistics
exports.getVoucherStats = async (req, res) => {
    try {
        const result = await query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'used') as used,
                COUNT(*) FILTER (WHERE status = 'expired') as expired,
                COUNT(*) FILTER (WHERE status = 'disabled') as disabled,
                COUNT(*) as total
            FROM vouchers
        `);

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching voucher stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
