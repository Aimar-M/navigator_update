-- Add deletion tracking field to users table
ALTER TABLE "users" ADD COLUMN "deletion_in_progress" boolean DEFAULT false;

-- Add original organizer tracking field to trips table
ALTER TABLE "trips" ADD COLUMN "original_organizer_id" integer REFERENCES "users"("id");

