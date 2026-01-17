-- Add clinic_schedule text column to store clinic timings/slots
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS clinic_schedule TEXT DEFAULT NULL;
