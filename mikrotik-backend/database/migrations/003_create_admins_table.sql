-- ================================================
-- Create Admins Table for Authentication
-- Migration: 003_create_admins_table
-- ================================================

-- Create admins table for system authentication
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Hashed password with bcrypt
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),

    -- Role and permissions
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support', 'technician')),
    permissions JSONB DEFAULT '[]',

    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,

    -- Password reset
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,

    -- Session tracking
    last_login TIMESTAMP,
    last_login_ip VARCHAR(45),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default super admin (password: admin123 - CHANGE THIS IN PRODUCTION!)
INSERT INTO admins (email, password, full_name, role, is_active, is_verified)
VALUES ('admin@noloji.com', '$2b$10$4JHQL1RS.dqE6HJCbNd4qOYqRsh1szxQQF1no4tFAWf2VDJor8HBu', 'System Administrator', 'super_admin', true, true)
ON CONFLICT (email) DO NOTHING;
