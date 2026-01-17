-- Fiber Cables table for GIS mapping
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS fiber_cables (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  -- GeoJSON LineString stored as array of [lng, lat] coordinates
  coordinates JSONB NOT NULL,
  cable_type VARCHAR(50) DEFAULT 'fiber', -- 'fiber', 'drop', 'trunk'
  length_meters DECIMAL(10, 2),
  fiber_count INTEGER DEFAULT 12,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'planned', 'maintenance'
  color VARCHAR(20) DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- GIS Labels/Points of Interest table
CREATE TABLE IF NOT EXISTS gis_labels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  label_type VARCHAR(50) DEFAULT 'poi', -- 'poi', 'olt', 'splitter', 'fdt', 'fat'
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  icon VARCHAR(50) DEFAULT 'marker',
  color VARCHAR(20) DEFAULT '#8b5cf6',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fiber_cables ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis_labels ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users
CREATE POLICY "Enable all for fiber_cables" ON fiber_cables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for gis_labels" ON gis_labels FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fiber_cables_status ON fiber_cables(status);
CREATE INDEX IF NOT EXISTS idx_gis_labels_type ON gis_labels(label_type);
