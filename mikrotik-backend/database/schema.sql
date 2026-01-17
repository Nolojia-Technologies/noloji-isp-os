-- ================================================
-- MikroTik RADIUS Billing Database Schema
-- PostgreSQL 12+
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- Table: routers
-- Store MikroTik router information
-- ================================================
CREATE TABLE routers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    api_port INTEGER DEFAULT 8728,
    api_username VARCHAR(100) NOT NULL,
    api_password VARCHAR(255) NOT NULL,
    nas_identifier VARCHAR(100) UNIQUE,
    radius_secret VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Table: plans
-- Bandwidth and time-based service plans
-- ================================================
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    -- Bandwidth limits (in Kbps)
    upload_speed INTEGER, -- Upload in Kbps (e.g., 2048 = 2Mbps)
    download_speed INTEGER, -- Download in Kbps (e.g., 10240 = 10Mbps)

    -- Time limits
    session_timeout INTEGER, -- Max session duration in seconds
    idle_timeout INTEGER, -- Idle timeout in seconds
    validity_days INTEGER, -- How many days the plan is valid

    -- Data limits
    data_limit_mb BIGINT, -- Total data limit in MB

    -- Pricing
    price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'KES',

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Table: users
-- End-user accounts
-- ================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Hashed password
    email VARCHAR(255),
    phone VARCHAR(50),
    full_name VARCHAR(255),

    -- Plan association
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,

    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,

    -- Account validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,

    -- Usage tracking
    total_data_used_mb BIGINT DEFAULT 0,
    total_session_time INTEGER DEFAULT 0, -- in seconds

    -- MAC binding
    mac_address VARCHAR(17),

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- ================================================
-- Table: vouchers
-- Prepaid voucher codes
-- ================================================
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    pin VARCHAR(20),

    -- Plan association
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,

    -- Batch tracking
    batch_id VARCHAR(100),

    -- Voucher status
    status VARCHAR(20) DEFAULT 'active', -- active, used, expired, disabled

    -- Usage info
    used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    used_at TIMESTAMP,

    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,

    -- Metadata
    created_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Table: sessions
-- Active and historical user sessions
-- ================================================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL, -- Acct-Session-Id from RADIUS

    -- User info
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,

    -- Router info
    router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL,
    nas_ip_address INET,
    nas_identifier VARCHAR(100),
    nas_port_id VARCHAR(50),

    -- Client info
    framed_ip_address INET,
    mac_address VARCHAR(17),

    -- Session timing
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stop_time TIMESTAMP,
    session_duration INTEGER DEFAULT 0, -- in seconds
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Usage statistics
    input_octets BIGINT DEFAULT 0, -- Bytes received by NAS from user
    output_octets BIGINT DEFAULT 0, -- Bytes sent by NAS to user
    input_packets BIGINT DEFAULT 0,
    output_packets BIGINT DEFAULT 0,
    input_gigawords INTEGER DEFAULT 0,
    output_gigawords INTEGER DEFAULT 0,

    -- Bandwidth tracking
    input_rate INTEGER, -- Current upload speed in Kbps
    output_rate INTEGER, -- Current download speed in Kbps

    -- Session status
    status VARCHAR(20) DEFAULT 'active', -- active, stopped, timeout, error
    terminate_cause VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Table: radius_logs
-- Complete RADIUS packet logging
-- ================================================
CREATE TABLE radius_logs (
    id SERIAL PRIMARY KEY,

    -- Request info
    request_type VARCHAR(50) NOT NULL, -- Access-Request, Accounting-Request
    packet_type VARCHAR(50), -- Start, Stop, Interim-Update, Access-Accept, Access-Reject

    -- User info
    username VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Session info
    session_id VARCHAR(100),

    -- Router info
    nas_ip_address INET,
    nas_identifier VARCHAR(100),
    nas_port_id VARCHAR(50),

    -- Client info
    framed_ip_address INET,
    mac_address VARCHAR(17),

    -- Authentication
    auth_result VARCHAR(20), -- Accept, Reject, Challenge
    reject_reason TEXT,

    -- Request attributes
    attributes JSONB,

    -- Response attributes
    response_attributes JSONB,

    -- Timing
    response_time_ms INTEGER,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Table: bandwidth_usage
-- Detailed bandwidth usage tracking
-- ================================================
CREATE TABLE bandwidth_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),

    -- Time bucket (for aggregation)
    recorded_at TIMESTAMP NOT NULL,
    time_bucket TIMESTAMP NOT NULL, -- Rounded to hour/day for aggregation

    -- Usage in bytes
    upload_bytes BIGINT DEFAULT 0,
    download_bytes BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,

    -- Created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Table: disconnection_queue
-- Queue for users to be disconnected
-- ================================================
CREATE TABLE disconnection_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- Indexes for Performance
-- ================================================

-- Users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_online ON users(is_online);
CREATE INDEX idx_users_valid_until ON users(valid_until);
CREATE INDEX idx_users_plan_id ON users(plan_id);

-- Vouchers table indexes
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_batch_id ON vouchers(batch_id);
CREATE INDEX idx_vouchers_valid_until ON vouchers(valid_until);

-- Sessions table indexes
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_username ON sessions(username);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_nas_ip ON sessions(nas_ip_address);
CREATE INDEX idx_sessions_framed_ip ON sessions(framed_ip_address);

-- RADIUS logs indexes
CREATE INDEX idx_radius_logs_username ON radius_logs(username);
CREATE INDEX idx_radius_logs_session_id ON radius_logs(session_id);
CREATE INDEX idx_radius_logs_created_at ON radius_logs(created_at);
CREATE INDEX idx_radius_logs_request_type ON radius_logs(request_type);
CREATE INDEX idx_radius_logs_nas_ip ON radius_logs(nas_ip_address);

-- Bandwidth usage indexes
CREATE INDEX idx_bandwidth_user_id ON bandwidth_usage(user_id);
CREATE INDEX idx_bandwidth_time_bucket ON bandwidth_usage(time_bucket);
CREATE INDEX idx_bandwidth_recorded_at ON bandwidth_usage(recorded_at);

-- Disconnection queue indexes
CREATE INDEX idx_disconnection_status ON disconnection_queue(status);
CREATE INDEX idx_disconnection_username ON disconnection_queue(username);

-- ================================================
-- Functions and Triggers
-- ================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routers_updated_at BEFORE UPDATE ON routers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Views for Reporting
-- ================================================

-- Active sessions view
CREATE VIEW v_active_sessions AS
SELECT
    s.id,
    s.session_id,
    s.username,
    u.full_name,
    p.name as plan_name,
    s.framed_ip_address,
    s.mac_address,
    s.start_time,
    s.session_duration,
    s.input_octets,
    s.output_octets,
    (s.input_octets + s.output_octets) as total_bytes,
    r.name as router_name,
    r.nas_identifier
FROM sessions s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN plans p ON u.plan_id = p.id
LEFT JOIN routers r ON s.router_id = r.id
WHERE s.status = 'active';

-- User usage summary view
CREATE VIEW v_user_usage_summary AS
SELECT
    u.id,
    u.username,
    u.full_name,
    p.name as plan_name,
    u.is_active,
    u.is_online,
    u.valid_until,
    u.total_data_used_mb,
    u.total_session_time,
    COUNT(DISTINCT s.id) as total_sessions,
    MAX(s.start_time) as last_session_time
FROM users u
LEFT JOIN plans p ON u.plan_id = p.id
LEFT JOIN sessions s ON u.id = s.user_id
GROUP BY u.id, u.username, u.full_name, p.name, u.is_active, u.is_online, u.valid_until, u.total_data_used_mb, u.total_session_time;

-- ================================================
-- Initial Data
-- ================================================

-- Insert default router
INSERT INTO routers (name, host, api_username, api_password, nas_identifier, radius_secret, location)
VALUES ('Main Gateway', '192.168.88.1', 'admin', 'change_me', 'MikroTik-Gateway', 'change_me', 'Main Office');

-- Insert sample plans
INSERT INTO plans (name, description, upload_speed, download_speed, session_timeout, validity_days, price) VALUES
('1 Hour - 2Mbps', 'Basic browsing for 1 hour', 2048, 2048, 3600, 1, 1.00),
('1 Day - 5Mbps', 'Standard daily plan', 5120, 5120, NULL, 1, 5.00),
('1 Week - 10Mbps', 'Weekly unlimited plan', 10240, 10240, NULL, 7, 20.00),
('1 Month - 20Mbps', 'Monthly premium plan', 20480, 20480, NULL, 30, 50.00);

-- ================================================
-- Database Schema Complete
-- ================================================

COMMENT ON DATABASE wifi_billing IS 'MikroTik RADIUS and Billing System Database';
