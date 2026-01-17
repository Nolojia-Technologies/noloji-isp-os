-- Customer CPE (Customer Premises Equipment) Table
-- Stores EPON/GPON ONT access credentials and status

CREATE TABLE IF NOT EXISTS customer_cpe (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  cpe_ip VARCHAR(45),
  cpe_port INTEGER DEFAULT 23,
  cpe_username VARCHAR(100) DEFAULT 'admin',
  cpe_password VARCHAR(255),
  cpe_type VARCHAR(50) DEFAULT 'gpon', -- 'gpon', 'epon', 'mikrotik'
  
  -- WiFi settings (cached from device)
  wifi_ssid VARCHAR(100),
  wifi_password VARCHAR(100),
  
  -- Optical power levels (cached from last read)
  last_optical_rx DECIMAL(6,2), -- Receive power in dBm
  last_optical_tx DECIMAL(6,2), -- Transmit power in dBm
  
  -- Traffic stats (cached)
  bytes_in BIGINT DEFAULT 0,
  bytes_out BIGINT DEFAULT 0,
  
  last_connected TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(customer_id)
);

-- Enable RLS
ALTER TABLE customer_cpe ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust based on your auth model)
CREATE POLICY "Enable all for authenticated users" ON customer_cpe
  FOR ALL USING (true) WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_customer_cpe_customer_id ON customer_cpe(customer_id);
