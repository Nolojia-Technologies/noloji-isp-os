const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// JWT Secret - should be in .env in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register new admin user
 */
exports.register = async (req, res) => {
    try {
        const { email, password, full_name, phone, role = 'admin' } = req.body;

        // Validate required fields
        if (!email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and full name are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate password strength (min 6 characters)
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if email already exists
        const existingUser = await query(
            'SELECT id FROM admins WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new admin
        const result = await query(
            `INSERT INTO admins (email, password, full_name, phone, role, is_active, is_verified)
             VALUES ($1, $2, $3, $4, $5, true, false)
             RETURNING id, email, full_name, phone, role, is_active, created_at`,
            [email.toLowerCase(), hashedPassword, full_name, phone, role]
        );

        const newAdmin = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            {
                id: newAdmin.id,
                email: newAdmin.email,
                role: newAdmin.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                admin: {
                    id: newAdmin.id,
                    email: newAdmin.email,
                    full_name: newAdmin.full_name,
                    phone: newAdmin.phone,
                    role: newAdmin.role,
                    is_active: newAdmin.is_active
                },
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            message: error.message
        });
    }
};

/**
 * Login admin user
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find admin by email
        const result = await query(
            `SELECT id, email, password, full_name, phone, role, is_active, is_verified
             FROM admins
             WHERE email = $1`,
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const admin = result.rows[0];

        // Check if account is active
        if (!admin.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Account is inactive. Please contact administrator.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Update last login
        const clientIp = req.ip || req.connection.remoteAddress;
        await query(
            `UPDATE admins
             SET last_login = CURRENT_TIMESTAMP, last_login_ip = $1
             WHERE id = $2`,
            [clientIp, admin.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                role: admin.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Remove password from response
        delete admin.password;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                admin: {
                    id: admin.id,
                    email: admin.email,
                    full_name: admin.full_name,
                    phone: admin.phone,
                    role: admin.role,
                    is_active: admin.is_active,
                    is_verified: admin.is_verified
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: error.message
        });
    }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
    try {
        // User is already attached to req by auth middleware
        const result = await query(
            `SELECT id, email, full_name, phone, role, is_active, is_verified, last_login, created_at
             FROM admins
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
            message: error.message
        });
    }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const userId = req.user.id;

        const result = await query(
            `UPDATE admins
             SET full_name = COALESCE($1, full_name),
                 phone = COALESCE($2, phone)
             WHERE id = $3
             RETURNING id, email, full_name, phone, role, is_active, is_verified`,
            [full_name, phone, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            message: error.message
        });
    }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }

        // Get current password hash
        const result = await query(
            'SELECT password FROM admins WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(
            current_password,
            result.rows[0].password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await query(
            'UPDATE admins SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password',
            message: error.message
        });
    }
};

/**
 * Verify JWT token (for frontend to check if token is still valid)
 */
exports.verifyToken = async (req, res) => {
    try {
        // If we reach here, the auth middleware has already verified the token
        res.json({
            success: true,
            message: 'Token is valid',
            data: {
                user: req.user
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

/**
 * Logout (client-side will remove token, this is just for logging)
 */
exports.logout = async (req, res) => {
    try {
        // In a stateless JWT system, logout is mainly handled on the client
        // This endpoint can be used for logging purposes
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
};
