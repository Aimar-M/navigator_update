-- Add has_seen_onboarding field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_onboarding boolean DEFAULT false;

