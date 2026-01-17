-- ================================================
-- Update Currency to KES
-- Migration: 002_update_currency_to_kes
-- ================================================

-- Update plans table to use KES as default currency
UPDATE plans SET currency = 'KES' WHERE currency = 'USD' OR currency IS NULL;

-- Update default currency for future records
ALTER TABLE plans ALTER COLUMN currency SET DEFAULT 'KES';
