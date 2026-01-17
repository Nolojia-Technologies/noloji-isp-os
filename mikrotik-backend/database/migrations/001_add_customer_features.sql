-- ================================================
-- Add Customer Management Features
-- Migration: 001_add_customer_features
-- ================================================

-- Add connection_type to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS connection_type VARCHAR(20) DEFAULT 'HOTSPOT' CHECK (connection_type IN ('HOTSPOT', 'PPPOE'));

-- Add more user tracking fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL;

-- ================================================
-- Table: sms_credits
-- SMS Credits Management
-- ================================================
CREATE TABLE IF NOT EXISTS sms_credits (
    id SERIAL PRIMARY KEY,
    balance INTEGER DEFAULT 0, -- Total SMS credits available
    used INTEGER DEFAULT 0, -- SMS credits used
    cost_per_sms DECIMAL(10, 4) DEFAULT 0.50, -- Cost per SMS in local currency
    currency VARCHAR(10) DEFAULT 'KES',
    last_purchase_date TIMESTAMP,
    last_purchase_amount INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial SMS credit record
INSERT INTO sms_credits (balance, cost_per_sms, currency)
VALUES (0, 0.50, 'KES')
ON CONFLICT DO NOTHING;

-- ================================================
-- Table: sms_logs
-- SMS Sending History
-- ================================================
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(20) NOT NULL, -- Phone number
    message TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SENT, FAILED, DELIVERED
    credits_used INTEGER DEFAULT 1,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    sender_id VARCHAR(20), -- SMS sender ID
    external_message_id VARCHAR(100), -- ID from SMS provider
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at);

-- ================================================
-- Table: sms_templates
-- Predefined SMS Templates
-- ================================================
CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    template TEXT NOT NULL,
    category VARCHAR(50), -- WELCOME, EXPIRY, PAYMENT, NOTIFICATION
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default SMS templates
INSERT INTO sms_templates (name, description, template, category) VALUES
('welcome', 'Welcome message for new customers', 'Welcome to {{company}}! Your account {{username}} has been created. Package: {{package}}, Valid until: {{expiry}}. Thank you!', 'WELCOME'),
('expiry_reminder', 'Subscription expiry reminder', 'Hi {{name}}, your {{package}} subscription expires on {{expiry}}. Please renew to continue enjoying our services. Call {{support_phone}}.', 'EXPIRY'),
('payment_received', 'Payment confirmation', 'Payment of {{currency}} {{amount}} received. Your {{package}} is now active until {{expiry}}. Thank you!', 'PAYMENT'),
('expired', 'Account expired notification', 'Hi {{name}}, your account has expired. Please renew your subscription to restore service. Call {{support_phone}}.', 'EXPIRY')
ON CONFLICT (name) DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_connection_type ON users(connection_type);
CREATE INDEX IF NOT EXISTS idx_users_valid_until ON users(valid_until);
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);
CREATE INDEX IF NOT EXISTS idx_users_router_id ON users(router_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_credits_updated_at ON sms_credits;
CREATE TRIGGER update_sms_credits_updated_at BEFORE UPDATE ON sms_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;
CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routers_updated_at ON routers;
CREATE TRIGGER update_routers_updated_at BEFORE UPDATE ON routers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
