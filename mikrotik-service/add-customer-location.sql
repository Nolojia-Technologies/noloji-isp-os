-- Add location fields to customers table for GIS mapping
-- Run this in Supabase SQL Editor

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(latitude, longitude);
