-- Add optional image column to messages for chat photo sharing
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image text;
