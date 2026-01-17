-- ================================================
-- MikroTik Integration - Additional Database Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- Create the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add new columns to routers table (if not exists)
ALTER TABLE routers 
ADD COLUMN IF NOT EXISTS use_ssl BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'hotspot' CHECK (role IN ('hotspot', 'pppoe', 'edge')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'degraded')),
ADD COLUMN IF NOT EXISTS cpu_usage INTEGER,
ADD COLUMN IF NOT EXISTS memory_usage INTEGER,
ADD COLUMN IF NOT EXISTS uptime TEXT,
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

-- Rename api_password to api_password_encrypted if needed
-- (Skip if already named correctly)

-- ================================================
-- Table: router_commands_log
-- Audit trail for all MikroTik commands
-- ================================================
CREATE TABLE IF NOT EXISTS router_commands_log (
    id SERIAL PRIMARY KEY,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    result JSONB,
    success BOOLEAN DEFAULT false,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_router_commands_router_id ON router_commands_log(router_id);
CREATE INDEX IF NOT EXISTS idx_router_commands_created_at ON router_commands_log(created_at);

-- ================================================
-- Table: router_jobs
-- Job queue for MikroTik operations
-- ================================================
CREATE TABLE IF NOT EXISTS router_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('provision', 'suspend', 'activate', 'speed_change', 'disconnect', 'health_check')),
    payload JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_router_jobs_status ON router_jobs(status);
CREATE INDEX IF NOT EXISTS idx_router_jobs_router_id ON router_jobs(router_id);

-- ================================================
-- Table: pppoe_profiles
-- PPPoE profile configuration
-- ================================================
CREATE TABLE IF NOT EXISTS pppoe_profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    rate_limit TEXT,
    local_address TEXT,
    remote_address TEXT,
    only_one BOOLEAN DEFAULT true,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Table: hotspot_profiles
-- Hotspot profile configuration
-- ================================================
CREATE TABLE IF NOT EXISTS hotspot_profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    rate_limit TEXT,
    session_timeout TEXT,
    idle_timeout TEXT,
    shared_users INTEGER DEFAULT 1,
    router_id INTEGER REFERENCES routers(id) ON DELETE CASCADE,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- RLS Policies for new tables
-- ================================================
ALTER TABLE router_commands_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE router_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pppoe_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "router_commands_log_policy" ON router_commands_log 
    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "router_jobs_policy" ON router_jobs 
    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "pppoe_profiles_policy" ON pppoe_profiles 
    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "hotspot_profiles_policy" ON hotspot_profiles 
    FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- Updated_at triggers
-- ================================================
CREATE TRIGGER update_pppoe_profiles_updated_at BEFORE UPDATE ON pppoe_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotspot_profiles_updated_at BEFORE UPDATE ON hotspot_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Function to auto-create profiles when plan is created
-- ================================================
CREATE OR REPLACE FUNCTION create_profiles_for_plan()
RETURNS TRIGGER AS $$
DECLARE
    rate_limit TEXT;
    profile_name TEXT;
BEGIN
    -- Calculate rate limit string (Kbps to format like "2M/5M")
    rate_limit := CONCAT(
        CASE WHEN NEW.upload_speed >= 1024 THEN CONCAT(NEW.upload_speed / 1024, 'M')
             ELSE CONCAT(NEW.upload_speed, 'k') END,
        '/',
        CASE WHEN NEW.download_speed >= 1024 THEN CONCAT(NEW.download_speed / 1024, 'M')
             ELSE CONCAT(NEW.download_speed, 'k') END
    );
    
    profile_name := CONCAT('plan-', LOWER(REPLACE(NEW.name, ' ', '-')));
    
    -- Create hotspot profile
    INSERT INTO hotspot_profiles (name, plan_id, rate_limit, session_timeout)
    VALUES (profile_name, NEW.id, rate_limit, 
            CASE WHEN NEW.session_timeout IS NOT NULL 
                 THEN CONCAT(NEW.session_timeout, 's') 
                 ELSE NULL END)
    ON CONFLICT (name) DO UPDATE SET 
        rate_limit = EXCLUDED.rate_limit,
        session_timeout = EXCLUDED.session_timeout;
    
    -- Create PPPoE profile
    INSERT INTO pppoe_profiles (name, plan_id, rate_limit)
    VALUES (profile_name, NEW.id, rate_limit)
    ON CONFLICT (name) DO UPDATE SET rate_limit = EXCLUDED.rate_limit;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profiles when plan is created/updated
DROP TRIGGER IF EXISTS create_plan_profiles ON plans;
CREATE TRIGGER create_plan_profiles
    AFTER INSERT OR UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION create_profiles_for_plan();

-- ================================================
-- Create profiles for existing plans by updating them
-- (This triggers the create_plan_profiles trigger)
-- ================================================
UPDATE plans SET updated_at = NOW() WHERE id > 0;

SELECT 'MikroTik schema additions complete!' as status;
