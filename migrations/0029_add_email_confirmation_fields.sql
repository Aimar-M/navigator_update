-- Add email confirmation and password reset fields to users table
ALTER TABLE "users" ADD COLUMN "email_confirmed" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN "email_confirmation_token" text;
ALTER TABLE "users" ADD COLUMN "password_reset_token" text;
ALTER TABLE "users" ADD COLUMN "password_reset_expires" timestamp;
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now();
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();
ALTER TABLE "users" ADD COLUMN "last_name" text;
ALTER TABLE "users" ADD COLUMN "bio" text;
ALTER TABLE "users" ADD COLUMN "location" text;
ALTER TABLE "users" ADD COLUMN "venmo_username" text;
ALTER TABLE "users" ADD COLUMN "paypal_email" text;
ALTER TABLE "users" ADD COLUMN "legacy_removed" boolean DEFAULT false; 