-- Add Google OAuth fields to users table
ALTER TABLE "users" ADD COLUMN "google_id" text;
ALTER TABLE "users" ADD COLUMN "google_email" text;
ALTER TABLE "users" ADD COLUMN "google_name" text;
ALTER TABLE "users" ADD COLUMN "google_picture" text;
ALTER TABLE "users" ADD COLUMN "is_oauth_user" boolean DEFAULT false;

-- Create unique index on google_id for OAuth users
CREATE UNIQUE INDEX "users_google_id_unique" ON "users" ("google_id") WHERE "google_id" IS NOT NULL; 