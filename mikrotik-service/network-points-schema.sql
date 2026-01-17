-- Network Points table for FATs, Closures, and other distribution points
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS network_points (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  point_type VARCHAR(50) DEFAULT 'fat', -- 'fat', 'closure', 'splitter', 'olt', 'fdt'
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  capacity INTEGER DEFAULT 8, -- Total ports/slots available
  used_ports INTEGER DEFAULT 0, -- Ports currently in use
  available_signals JSONB DEFAULT '[]', -- Array of signal names available for clients
  customer_ids JSONB DEFAULT '[]', -- Array of customer IDs served from this point
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'planned', 'maintenance'
  color VARCHAR(20) DEFAULT '#f97316',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE network_points ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users
CREATE POLICY "Enable all for network_points" ON network_points FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_network_points_type ON network_points(point_type);
CREATE INDEX IF NOT EXISTS idx_network_points_status ON network_points(status);
CREATE INDEX IF NOT EXISTS idx_network_points_location ON network_points(latitude, longitude);
