-- ================================================
-- STEP 1: Run this FIRST to clean up any existing tables
-- ================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all tables (CASCADE handles dependencies)
DROP TABLE IF EXISTS sms_templates CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS sms_credits CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS routers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

SELECT 'Cleanup complete! Now run step 2.' as status;
