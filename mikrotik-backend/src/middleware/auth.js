const jwt = require('jsonwebtoken');

// JWT Secret - should match the one in authController
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to authenticate JWT tokens
 * Usage: Add this middleware to routes that require authentication
 */
const authenticateToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }

        // Verify token
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                // Token is invalid or expired
                return res.status(403).json({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }

            // Attach user info to request object
            req.user = user;
            next();
        });

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * Middleware to check if user has specific role(s)
 * Usage: authenticateRole(['super_admin', 'admin'])
 */
const authenticateRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if user object exists (should be set by authenticateToken middleware)
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if user's role is in the allowed roles
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions'
                });
            }

            next();

        } catch (error) {
            console.error('Role auth middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Authorization failed'
            });
        }
    };
};

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs non-authenticated users
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            // No token provided, continue without user info
            return next();
        }

        // Try to verify token
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                // Token is valid, attach user info
                req.user = user;
            }
            // Continue regardless of token validity
            next();
        });

    } catch (error) {
        // Continue on error
        next();
    }
};

module.exports = {
    authenticateToken,
    authenticateRole,
    optionalAuth
};
