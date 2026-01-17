-- Add NOLOJIA 1 Router to Database
-- Run this in Supabase SQL Editor

INSERT INTO routers (
    name,
    host,
    api_port,
    api_username,
    api_password,
    radius_secret,
    use_ssl,
    role,
    status,
    is_active
) VALUES (
    'NOLOJIA 1',
    '192.168.88.1',
    8728,
    'admin',
    '21890547NjeriMChacha.',
    'radiussecret123',
    false,
    'hotspot',
    'offline',
    true
);

SELECT 'Router added!' as status;
