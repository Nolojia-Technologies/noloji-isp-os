-- ================================================
-- STEP 3: Run this LAST to add RLS, triggers, and data
-- ================================================

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admins_policy" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "routers_policy" ON routers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "plans_policy" ON plans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "customers_policy" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "vouchers_policy" ON vouchers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sessions_policy" ON sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sms_credits_policy" ON sms_credits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sms_logs_policy" ON sms_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "sms_templates_policy" ON sms_templates FOR ALL USING (auth.role() = 'authenticated');

-- Function to create admin on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admins (id, email, full_name, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample plans
INSERT INTO plans (name, description, upload_speed, download_speed, session_timeout, validity_days, price) VALUES
('1 Hour - 2Mbps', 'Basic browsing for 1 hour', 2048, 2048, 3600, 1, 50.00),
('1 Day - 5Mbps', 'Standard daily plan', 5120, 5120, NULL, 1, 150.00),
('1 Week - 10Mbps', 'Weekly unlimited plan', 10240, 10240, NULL, 7, 500.00),
('1 Month - 20Mbps', 'Monthly premium plan', 20480, 20480, NULL, 30, 1500.00);

-- Insert SMS credits
INSERT INTO sms_credits (balance, cost_per_sms, currency) VALUES (0, 0.50, 'KES');

-- Insert sample templates
INSERT INTO sms_templates (name, category, content, variables) VALUES
('Welcome', 'notification', 'Welcome to Nolojia! Your account is now active.', '["username"]'),
('Payment Reminder', 'billing', 'Hi, your subscription expires soon.', '["name", "expiry_date"]');

SELECT 'Setup complete! You can now use the app.' as status;
