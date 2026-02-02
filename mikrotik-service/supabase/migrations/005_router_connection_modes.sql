-- Migration: Add router connection modes and callback support
-- Run this migration to support RADIUS/Push mode routers

-- Add new columns to routers table
ALTER TABLE routers 
ADD COLUMN IF NOT EXISTS connection_mode TEXT DEFAULT 'api' CHECK (connection_mode IN ('api', 'radius')),
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS callback_token TEXT,
ADD COLUMN IF NOT EXISTS public_url TEXT;

-- Update existing routers to have a callback token
UPDATE routers 
SET callback_token = encode(gen_random_bytes(32), 'hex')
WHERE callback_token IS NULL;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_routers_callback_token ON routers(callback_token);
CREATE INDEX IF NOT EXISTS idx_routers_nas_identifier ON routers(nas_identifier);

-- Add comment
COMMENT ON COLUMN routers.connection_mode IS 'api = cloud connects to router, radius = router connects to cloud';
COMMENT ON COLUMN routers.callback_token IS 'Unique token for authenticating webhook callbacks from router';
COMMENT ON COLUMN routers.last_heartbeat IS 'Last time router sent a heartbeat via callback';
