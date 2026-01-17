-- ================================================
-- STEP 2: Run this AFTER step 1 to create all tables
-- ================================================

-- Table: admins
CREATE TABLE admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: routers
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

-- Table: plans
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

-- Table: customers
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
    connection_type TEXT DEFAULT 'pppoe',
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

-- Table: vouchers
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    pin TEXT,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    batch_id TEXT,
    status TEXT DEFAULT 'active',
    used_by INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sessions
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
    status TEXT DEFAULT 'active',
    terminate_cause TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sms_credits
CREATE TABLE sms_credits (
    id SERIAL PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    cost_per_sms DECIMAL(10, 4) DEFAULT 0.50,
    currency TEXT DEFAULT 'KES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sms_logs
CREATE TABLE sms_logs (
    id SERIAL PRIMARY KEY,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    sender_id TEXT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    provider_message_id TEXT,
    provider_response JSONB,
    cost DECIMAL(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Table: sms_templates
CREATE TABLE sms_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'All tables created! Now run step 3.' as status;
