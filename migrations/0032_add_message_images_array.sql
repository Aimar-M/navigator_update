-- Change messages.image from single text to array of text for multiple images
-- First, create a backup of existing image data
CREATE TABLE IF NOT EXISTS messages_backup AS SELECT * FROM messages;

-- Add new images array column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS images text[];

-- Migrate existing single image data to images array
UPDATE messages 
SET images = ARRAY[image] 
WHERE image IS NOT NULL AND images IS NULL;

-- Drop the old single image column
ALTER TABLE messages DROP COLUMN IF NOT EXISTS image;

-- Rename images column to image for backward compatibility
ALTER TABLE messages RENAME COLUMN images TO image;
