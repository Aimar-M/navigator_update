-- Add support for 'maybe' RSVP status
-- This migration adds the 'maybe' option to the rsvp_status field

-- Update the comment to reflect the new status
COMMENT ON COLUMN trip_members.rsvp_status IS 'pending, awaiting_payment, confirmed, declined, maybe (RSVP status)';

-- No actual schema changes needed as the field is already text and can accept any value
-- The validation is handled at the application level
