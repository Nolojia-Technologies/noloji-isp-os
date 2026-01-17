-- Add core_signals column to fiber_cables table
-- Run this in Supabase SQL Editor

ALTER TABLE fiber_cables ADD COLUMN IF NOT EXISTS core_signals JSONB DEFAULT '[]';

-- Example data structure: [{"core": 1, "signal": "Internet Uplink"}, {"core": 2, "signal": "IPTV"}]

COMMENT ON COLUMN fiber_cables.core_signals IS 'JSON array of core signal mappings. Each object has "core" (number) and "signal" (string).';
