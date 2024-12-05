-- Add calendar-related columns to chores table
ALTER TABLE chores 
ADD COLUMN next_occurrence TEXT,
ADD COLUMN time_preference TEXT DEFAULT '09:00:00',
ADD COLUMN last_completed TEXT;

-- Update next_occurrence for existing chores
UPDATE chores 
SET next_occurrence = DATE('now')
WHERE next_occurrence IS NULL;