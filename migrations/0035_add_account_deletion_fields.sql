-- Add account deletion and recovery fields to users table
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "users" ADD COLUMN "account_recovery_token" text;
ALTER TABLE "users" ADD COLUMN "account_recovery_expires" timestamp;

