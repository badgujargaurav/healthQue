-- Add profile_completed flag to doctors so we can hide profile completion once done
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS profile_completed TINYINT(1) DEFAULT 0;
