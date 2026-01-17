-- ================================================
-- Nolojia Billing - Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ================================================

-- Drop existing objects if they exist (clean slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
DROP TRIGGER IF EXISTS update_routers_updated_at ON routers;
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS update_sms_credits_updated_at ON sms_credits;
DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS sms_templates CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS sms_credits CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS routers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ================================================
-- Table: admins
-- Dashboard admin users (linked to Supabase Auth)
-- ================================================
CREATE TABLE admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'ops_manager', 'technician', 'billing_agent', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Table: routers
-- MikroTik router information
-- ================================================
CREATE TABLE routers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    api_port INTEGER DEFAULT 8728,
    api_username TEXT NOT NULL,
    api_password TEXT NOT NULL,
    nas_identifier TEXT UNIQUE,
    radius_secret TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Table: plans
-- Internet service plans
-- ================================================
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    upload_speed INTEGER,
    download_speed INTEGER,
    session_timeout INTEGER,
    idle_timeout INTEGER,
    validity_days INTEGER,
    data_limit_mb BIGINT,
    price DECIMAL(10, 2),
    currency TEXT DEFAULT 'KES',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Table: customers
-- End users / subscribers
-- ================================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    full_name TEXT,
    address TEXT,
    id_number TEXT,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL,
    connection_type TEXT DEFAULT 'pppoe' CHECK (connection_type IN ('pppoe', 'hotspot', 'static')),
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    total_data_used_mb BIGINT DEFAULT 0,
    total_session_time INTEGER DEFAULT 0,
    mac_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- ================================================
-- Table: vouchers
-- ================================================
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    pin TEXT,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    batch_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'disabled')),
    used_by INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Table: sessions
-- ================================================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    router_id INTEGER REFERENCES routers(id) ON DELETE SET NULL,
    nas_ip_address INET,
    nas_identifier TEXT,
    nas_port_id TEXT,
    framed_ip_address INET,
    mac_address TEXT,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    stop_time TIMESTAMPTZ,
    session_duration INTEGER DEFAULT 0,
    last_update TIMESTAMPTZ DEFAULT NOW(),
    input_octets BIGINT DEFAULT 0,
    output_octets BIGINT DEFAULT 0,
    input_packets BIGINT DEFAULT 0,
    output_packets BIGINT DEFAULT 0,
    input_gigawords INTEGER DEFAULT 0,
    output_gigawords INTEGER DEFAULT 0,
    input_rate INTEGER,
    output_rate INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'timeout', 'error')),
    terminate_cause TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Table: sms_credits
-- ================================================
CREATE TABLE sms_credits (
    id SERIAL PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    cost_per_sms DECIMAL(10, 4) DEFAULT 0.50,
    currency TEXT DEFAULT 'KES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Table: sms_logs
-- ================================================
CREATE TABLE sms_logs (
    id SERIAL PRIMARY KEY,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    sender_id TEXT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    provider_message_id TEXT,
    provider_response JSONB,
    cost DECIMAL(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- ================================================
-- Table: sms_templates
-- ================================================
CREATE TABLE sms_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('billing', 'notification', 'marketing', 'support', 'custom')),
    content TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Indexes
-- ================================================
CREATE INDEX idx_customers_username ON customers(username);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customers_plan_id ON customers(plan_id);
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sms_logs_customer_id ON sms_logs(customer_id);

-- ================================================
-- Updated_at trigger function
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routers_updated_at BEFORE UPDATE ON routers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_credits_updated_at BEFORE UPDATE ON sms_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Row Level Security (RLS)
-- ================================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users full access
CREATE POLICY "admins_policy" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "routers_policy" ON routers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "plans_policy" ON plans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "customers_policy" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "vouchers_policy" ON vouchers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sessions_policy" ON sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sms_credits_policy" ON sms_credits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sms_logs_policy" ON sms_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sms_templates_policy" ON sms_templates FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- Function to create admin profile on signup
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admins (id, email, full_name, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create admin profile on auth signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- Initial Data
-- ================================================
INSERT INTO plans (name, description, upload_speed, download_speed, session_timeout, validity_days, price) VALUES
('1 Hour - 2Mbps', 'Basic browsing for 1 hour', 2048, 2048, 3600, 1, 50.00),
('1 Day - 5Mbps', 'Standard daily plan', 5120, 5120, NULL, 1, 150.00),
('1 Week - 10Mbps', 'Weekly unlimited plan', 10240, 10240, NULL, 7, 500.00),
('1 Month - 20Mbps', 'Monthly premium plan', 20480, 20480, NULL, 30, 1500.00);

INSERT INTO sms_credits (balance, cost_per_sms, currency) VALUES (0, 0.50, 'KES');

INSERT INTO sms_templates (name, category, content, variables) VALUES
('Welcome', 'notification', 'Welcome to Nolojia! Your account {{username}} is now active.', '["username"]'),
('Payment Reminder', 'billing', 'Hi {{name}}, your subscription expires on {{expiry_date}}.', '["name", "expiry_date"]'),
('Payment Received', 'billing', 'Payment of KES {{amount}} received. Thank you!', '["amount", "expiry_date"]');

-- Done!
SELECT 'Schema created successfully!' as status;
